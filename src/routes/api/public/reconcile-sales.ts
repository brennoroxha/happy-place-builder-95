import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeStatus, processWebhookEvent } from "@/lib/webhook.server";

const KLIVO_TRANSACTION_URL =
  "https://api.klivopay.com.br/api/public/v1/transactions";

async function reconcile() {
  // Look at sales from the last 48h that are still waiting
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("sales")
    .select("transaction_hash, status, raw_payload, amount_cents, payment_method")
    .eq("status", "waiting_payment")
    .gte("created_at", since)
    .limit(200);

  if (error) {
    console.error("[reconcile] query error", error);
    return { ok: false, error: error.message };
  }

  let checked = 0;
  let paid = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const raw = (row.raw_payload as Record<string, unknown>) ?? {};
    if (raw.provider !== "klivopay") continue;
    if (raw.utmify_paid_sent === true) continue;

    const tokenEnv =
      raw.klivo_account === "conta2"
        ? "KLIVOPAY_API_TOKEN_2"
        : "KLIVOPAY_API_TOKEN";
    const token = process.env[tokenEnv];
    if (!token) continue;

    checked++;
    try {
      const res = await fetch(
        `${KLIVO_TRANSACTION_URL}/${encodeURIComponent(row.transaction_hash)}?api_token=${encodeURIComponent(token)}`,
      );
      const json = (await res.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      const tx = ((json?.data as Record<string, unknown> | undefined) ??
        json ??
        {}) as Record<string, unknown>;
      const liveStatus = normalizeStatus(tx.status ?? tx.payment_status);
      if (res.ok && liveStatus === "paid") {
        await processWebhookEvent({
          hash: row.transaction_hash,
          status: "paid",
          paymentMethod: String(
            tx.payment_method ?? row.payment_method ?? "pix",
          ),
          amountCents:
            Number(tx.amount ?? row.amount_cents ?? 0) || undefined,
          paidAt:
            (tx.paid_at as string | undefined) ??
            (tx.approved_at as string | undefined) ??
            null,
          rawPayload: { provider: "klivopay_reconcile", ...tx },
        });
        paid++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${row.transaction_hash}: ${msg}`);
    }
  }

  return { ok: true, scanned: rows?.length ?? 0, checked, paid, errors };
}

export const Route = createFileRoute("/api/public/reconcile-sales")({
  server: {
    handlers: {
      GET: async () => {
        const result = await reconcile();
        return Response.json(result);
      },
      POST: async () => {
        const result = await reconcile();
        return Response.json(result);
      },
    },
  },
});
