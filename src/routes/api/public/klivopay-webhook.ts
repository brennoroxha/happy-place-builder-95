import { createFileRoute } from "@tanstack/react-router";
import { processWebhookEvent, normalizeStatus } from "@/lib/webhook.server";

export const Route = createFileRoute("/api/public/klivopay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Klivopay payload shapes seen: { hash, status, amount, customer, ... }
        // or { event, data: { hash, status, ... } }
        const data =
          (body.data as Record<string, unknown>) ??
          (body.transaction as Record<string, unknown>) ??
          body;

        const hash = String(
          data.hash ?? data.id ?? data.transaction_hash ?? body.hash ?? "",
        );
        if (!hash) {
          console.warn("[klivopay-webhook] missing hash", body);
          return new Response("ok", { status: 200 });
        }

        const status = normalizeStatus(
          data.status ?? data.payment_status ?? body.event ?? body.status,
        );

        const customer = (data.customer as Record<string, unknown>) ?? {};
        const amount = Number(data.amount ?? data.amount_cents ?? 0);

        const result = await processWebhookEvent({
          hash,
          status,
          paymentMethod: String(data.payment_method ?? "pix"),
          amountCents: amount > 0 ? amount : undefined,
          customer: {
            name: customer.name as string | undefined,
            email: customer.email as string | undefined,
            phone:
              (customer.phone_number as string | undefined) ??
              (customer.phone as string | undefined),
            document: customer.document as string | undefined,
          },
          paidAt: (data.paid_at as string) ?? null,
          rawPayload: body,
        });

        console.log("[klivopay-webhook]", hash, status, result);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
