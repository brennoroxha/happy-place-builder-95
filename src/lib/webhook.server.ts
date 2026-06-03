// Server-only helper: handles the gateway webhook → Utmify forwarding logic.
// Shared by both Klivopay and Freepay webhooks. Implements idempotency via
// `utmify_waiting_sent` / `utmify_paid_sent` flags persisted in raw_payload.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  sendUtmifyOrder,
  utmifyDate,
  type UtmifyTracking,
} from "@/lib/utmify.server";

export type NormalizedEvent = {
  hash: string;
  status: "waiting_payment" | "paid" | "refused" | "refunded" | "chargedback" | "unknown";
  paymentMethod?: string;
  amountCents?: number;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
    ip?: string | null;
  };
  products?: { id: string; name: string; quantity: number; priceInCents: number }[];
  paidAt?: string | null;
  rawPayload: Record<string, unknown>;
};

/** Normalize many possible status strings into our canonical set. */
export function normalizeStatus(s: unknown): NormalizedEvent["status"] {
  const v = String(s ?? "").toLowerCase();
  if (["paid", "approved", "completed", "succeeded", "success"].includes(v)) return "paid";
  if (["refused", "declined", "failed", "denied"].includes(v)) return "refused";
  if (["refunded", "refund"].includes(v)) return "refunded";
  if (["chargedback", "chargeback"].includes(v)) return "chargedback";
  if (
    ["waiting_payment", "pending", "pix.generated", "created", "processing"].includes(v)
  )
    return "waiting_payment";
  return "unknown";
}

function pickTracking(payload: Record<string, unknown>): UtmifyTracking {
  const t = (payload.checkout_tracking ?? payload.tracking ?? {}) as Record<string, unknown>;
  return {
    src: (t.src as string) ?? null,
    sck: (t.sck as string) ?? null,
    utm_source: (t.utm_source as string) ?? null,
    utm_campaign: (t.utm_campaign as string) ?? null,
    utm_medium: (t.utm_medium as string) ?? null,
    utm_content: (t.utm_content as string) ?? null,
    utm_term: (t.utm_term as string) ?? null,
  };
}

/**
 * Process a normalized webhook event:
 *  1. fetch existing sale by transaction_hash
 *  2. merge raw_payload (preserve checkout-time tracking)
 *  3. upsert sale with new status
 *  4. forward to Utmify with idempotency flags
 */
export async function processWebhookEvent(evt: NormalizedEvent) {
  const { hash } = evt;
  if (!hash) {
    console.warn("[webhook] event without hash, ignoring");
    return { ok: false, reason: "no_hash" };
  }

  // 1. fetch existing
  const { data: existing } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("transaction_hash", hash)
    .maybeSingle();

  const existingPayload = (existing?.raw_payload as Record<string, unknown>) ?? {};

  // 2. merge — checkout-time tracking is the source of truth
  const mergedPayload: Record<string, unknown> = {
    ...evt.rawPayload,
    ...existingPayload,
    last_webhook: evt.rawPayload,
    last_webhook_at: new Date().toISOString(),
    last_webhook_status: evt.status,
  };

  const utmifyWaitingSent = Boolean(existingPayload.utmify_waiting_sent);
  const utmifyPaidSent = Boolean(existingPayload.utmify_paid_sent);

  // Determine whether we should send to Utmify
  const shouldSendWaiting = evt.status === "waiting_payment" && !utmifyWaitingSent;
  const shouldSendPaid = evt.status === "paid" && !utmifyPaidSent;

  if (evt.status === "waiting_payment" && utmifyWaitingSent) {
    console.log("[webhook] duplicado ignorado (waiting_payment)", hash);
  }
  if (evt.status === "paid" && utmifyPaidSent) {
    console.log("[webhook] duplicado ignorado (paid)", hash);
  }

  let utmifyResult: { ok: boolean; error?: string } | null = null;

  if (shouldSendWaiting || shouldSendPaid) {
    const customer = {
      name:
        evt.customer?.name ??
        existing?.customer_name ??
        (existingPayload.customer as Record<string, unknown>)?.name as string ??
        null,
      email:
        evt.customer?.email ??
        existing?.customer_email ??
        (existingPayload.customer as Record<string, unknown>)?.email as string ??
        null,
      phone:
        evt.customer?.phone ??
        existing?.customer_phone ??
        (existingPayload.customer as Record<string, unknown>)?.phone as string ??
        null,
      document:
        evt.customer?.document ??
        existing?.customer_document ??
        (existingPayload.customer as Record<string, unknown>)?.document as string ??
        null,
      ip:
        evt.customer?.ip ??
        ((existingPayload.metadata as Record<string, unknown>)?.client_ip as string) ??
        null,
    };

    const amountCents =
      evt.amountCents ?? existing?.amount_cents ?? 0;

    const products =
      evt.products && evt.products.length > 0
        ? evt.products
        : [
            {
              id: hash,
              name: "Pedido",
              quantity: 1,
              priceInCents: amountCents,
            },
          ];

    const createdAt = existing?.created_at
      ? utmifyDate(new Date(existing.created_at))
      : utmifyDate();

    const klivoAccount = String(
      (existingPayload.klivo_account as string | undefined) ?? "",
    );
    const scope = String(
      (existingPayload.scope as string | undefined) ?? "",
    );
    const tokenEnv =
      klivoAccount === "conta2" || scope === "panini" || evt.rawPayload.scope === "panini" || evt.rawPayload.klivo_account === "conta2"
        ? "UTMIFY_API_TOKEN_PANINI"
        : "UTMIFY_API_TOKEN";

    utmifyResult = await sendUtmifyOrder({
      orderId: hash,
      status: evt.status === "paid" ? "paid" : "waiting_payment",
      paymentMethod: evt.paymentMethod ?? existing?.payment_method ?? "pix",
      createdAt,
      approvedDate: evt.status === "paid" ? evt.paidAt ?? utmifyDate() : null,
      customer,
      products,
      tracking: pickTracking(existingPayload),
      totalPriceInCents: amountCents,
      userCommissionInCents: amountCents,
      tokenEnv,
    });

    if (utmifyResult.ok) {
      if (shouldSendWaiting) mergedPayload.utmify_waiting_sent = true;
      if (shouldSendPaid) mergedPayload.utmify_paid_sent = true;
    }
  }

  // 4. upsert sale
  const safePayload = JSON.parse(JSON.stringify(mergedPayload));
  const { error: upsertError } = await supabaseAdmin.from("sales").upsert(
    {
      transaction_hash: hash,
      status: evt.status === "unknown" ? existing?.status ?? "waiting_payment" : evt.status,
      payment_method: evt.paymentMethod ?? existing?.payment_method ?? "pix",
      amount_cents: evt.amountCents ?? existing?.amount_cents ?? null,
      customer_name: evt.customer?.name ?? existing?.customer_name ?? null,
      customer_email: evt.customer?.email ?? existing?.customer_email ?? null,
      customer_phone: evt.customer?.phone ?? existing?.customer_phone ?? null,
      customer_document:
        evt.customer?.document ?? existing?.customer_document ?? null,
      raw_payload: safePayload,
      paid_at:
        evt.status === "paid"
          ? evt.paidAt ?? new Date().toISOString()
          : existing?.paid_at ?? null,
    },
    { onConflict: "transaction_hash" },
  );

  if (upsertError) {
    console.error("[webhook] upsert error", upsertError);
    return { ok: false, reason: "upsert_failed" };
  }

  return { ok: true, status: evt.status, utmify: utmifyResult };
}
