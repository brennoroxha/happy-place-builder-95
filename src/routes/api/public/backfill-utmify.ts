import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processWebhookEvent } from "@/lib/webhook.server";

async function backfill() {
  // Pegamos pedidos pagos do escopo Panini que não foram enviados ao Utmify (Paid)
  const { data: rows, error } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("status", "paid")
    .filter("raw_payload->>scope", "eq", "panini")
    .filter("raw_payload->>utmify_paid_sent", "is", null);

  if (error) {
    console.error("[backfill] query error", error);
    return { ok: false, error: error.message };
  }

  let processed = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    try {
      // Reprocessar o evento como 'paid' para disparar o sendUtmifyOrder
      // O processWebhookEvent cuida da idempotência e de setar utmify_paid_sent
      const result = await processWebhookEvent({
        hash: row.transaction_hash,
        status: "paid",
        paymentMethod: row.payment_method ?? "pix",
        amountCents: row.amount_cents ?? undefined,
        customer: {
          name: row.customer_name ?? undefined,
          email: row.customer_email ?? undefined,
          phone: row.customer_phone ?? undefined,
          document: row.customer_document ?? undefined,
        },
        paidAt: row.paid_at,
        rawPayload: (row.raw_payload as Record<string, unknown>) ?? {},
      });
      
      if (result.ok) {
        processed++;
      } else {
        errors.push(`${row.transaction_hash}: ${result.reason}`);
      }
    } catch (err) {
      errors.push(`${row.transaction_hash}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { ok: true, found: rows?.length ?? 0, processed, errors };
}

export const Route = createFileRoute("/api/public/backfill-utmify")({
  server: {
    handlers: {
      POST: async () => {
        const result = await backfill();
        return Response.json(result);
      },
      GET: async () => {
        const result = await backfill();
        return Response.json(result);
      },
    },
  },
});
