import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeStatus, processWebhookEvent } from "@/lib/webhook.server";

export type Provider = "klivopay" | "freepay" | "ironpay";

export type AdminSale = {
  hash: string;
  status: string;
  amountCents: number | null;
  paymentMethod: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerDocument: string | null;
  paidAt: string | null;
  createdAt: string;
  provider: Provider | null;
  scope: "slimbelly" | "panini";
  proofDataUrl: string | null;
  proofUploadedAt: string | null;
};

const scopeKey = (scope?: string) =>
  scope && scope !== "default" ? `active_provider_${scope}` : "active_provider";

const KLIVO_TRANSACTION_URL = "https://api.klivopay.com.br/api/public/v1/transactions";

export const getActiveProvider = createServerFn({ method: "GET" })
  .inputValidator((d: { scope?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", scopeKey(data.scope))
      .maybeSingle();
    const v = row?.value;
    const provider: Provider =
      v === "freepay" ? "freepay" : v === "ironpay" ? "ironpay" : "klivopay";
    return { provider };
  });

export const setActiveProvider = createServerFn({ method: "POST" })
  .inputValidator((d: { provider: Provider; scope?: string }) => {
    if (d.provider !== "klivopay" && d.provider !== "freepay" && d.provider !== "ironpay") {
      throw new Error("provider inválido");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: scopeKey(data.scope), value: data.provider, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type KlivoAccount = "conta1" | "conta2";

const klivoAccountKey = (scope?: string) =>
  `klivo_account_${scope && scope !== "default" ? scope : "slimbelly"}`;

const defaultKlivoAccount = (scope?: string): KlivoAccount =>
  scope === "panini" ? "conta2" : "conta1";

export const getKlivoAccount = createServerFn({ method: "GET" })
  .inputValidator((d: { scope?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", klivoAccountKey(data.scope))
      .maybeSingle();
    const v = row?.value;
    const account: KlivoAccount =
      v === "conta1" || v === "conta2" ? v : defaultKlivoAccount(data.scope);
    return { account };
  });

export const setKlivoAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { account: KlivoAccount; scope?: string }) => {
    if (d.account !== "conta1" && d.account !== "conta2") {
      throw new Error("conta inválida");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: klivoAccountKey(data.scope), value: data.account, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSales = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const sales: AdminSale[] = (data ?? []).map((s: Record<string, unknown>) => {
    const raw = (s.raw_payload as Record<string, unknown>) ?? {};
    const providerRaw = raw.provider as string | undefined;
    const provider: Provider | null =
      providerRaw === "freepay" || providerRaw === "klivopay" ? providerRaw : null;
    const scopeRaw = raw.scope as string | undefined;
    const scope: "slimbelly" | "panini" = scopeRaw === "panini" ? "panini" : "slimbelly";
    return {
      hash: String(s.transaction_hash),
      status: String(s.status),
      amountCents: (s.amount_cents as number) ?? null,
      paymentMethod: (s.payment_method as string) ?? null,
      customerName: (s.customer_name as string) ?? null,
      customerEmail: (s.customer_email as string) ?? null,
      customerPhone: (s.customer_phone as string) ?? null,
      customerDocument: (s.customer_document as string) ?? null,
      paidAt: (s.paid_at as string) ?? null,
      createdAt: String(s.created_at),
      provider,
      scope,
      proofDataUrl: (raw.proof_data_url as string) ?? null,
      proofUploadedAt: (raw.proof_uploaded_at as string) ?? null,
    };
  });
  return { sales };
});

export const markSaleConfirmed = createServerFn({ method: "POST" })
  .inputValidator((d: { hash: string }) => {
    if (!d.hash) throw new Error("hash obrigatório");
    return d;
  })
  .handler(async ({ data }) => {
    const result = await processWebhookEvent({
      hash: data.hash,
      status: "paid",
      paymentMethod: "pix",
      paidAt: new Date().toISOString(),
      rawPayload: {
        provider: "manual_confirmation",
        source: "admin_markSaleConfirmed",
        status: "paid",
      },
    });
    if (!result.ok) throw new Error(String(result.reason ?? "erro ao confirmar"));
    return { ok: true };
  });

export const getSaleStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { hash: string }) => {
    if (!d.hash) throw new Error("hash obrigatório");
    return d;
  })
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("sales")
      .select("status, raw_payload, amount_cents, payment_method")
      .eq("transaction_hash", data.hash)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let status = (row?.status as string) ?? "waiting_payment";
    const raw = (row?.raw_payload as Record<string, unknown>) ?? {};

    if (status !== "paid" && raw.provider === "klivopay") {
      const tokenEnv = raw.klivo_account === "conta2" ? "KLIVOPAY_API_TOKEN_2" : "KLIVOPAY_API_TOKEN";
      const token = process.env[tokenEnv];
      if (token) {
        try {
          const res = await fetch(
            `${KLIVO_TRANSACTION_URL}/${encodeURIComponent(data.hash)}?api_token=${encodeURIComponent(token)}`,
          );
          const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
          const tx = ((json?.data as Record<string, unknown> | undefined) ?? json ?? {}) as Record<string, unknown>;
          const liveStatus = normalizeStatus(tx.status ?? tx.payment_status);
          if (res.ok && liveStatus === "paid") {
            await processWebhookEvent({
              hash: data.hash,
              status: "paid",
              paymentMethod: String(tx.payment_method ?? row?.payment_method ?? "pix"),
              amountCents: Number(tx.amount ?? row?.amount_cents ?? 0) || undefined,
              paidAt: (tx.paid_at as string | undefined) ?? (tx.approved_at as string | undefined) ?? null,
              rawPayload: { provider: "klivopay_status_poll", ...tx },
            });
            status = "paid";
          }
        } catch (err) {
          console.error("[sales] failed to refresh Klivopay status", data.hash, err);
        }
      }
    }

    return { status };
  });
