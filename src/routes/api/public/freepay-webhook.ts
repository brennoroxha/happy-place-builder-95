import { createFileRoute } from "@tanstack/react-router";
import { processWebhookEvent, normalizeStatus } from "@/lib/webhook.server";

export const Route = createFileRoute("/api/public/freepay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const data =
          (Array.isArray(body.data)
            ? (body.data[0] as Record<string, unknown>)
            : (body.data as Record<string, unknown>)) ??
          body;

        const hash = String(
          data.id ?? data.transaction_id ?? body.id ?? body.hash ?? body.transaction_id ?? "",
        );
        if (!hash) {
          console.warn("[freepay-webhook] missing id", JSON.stringify(body));
          return new Response("ok", { status: 200 });
        }

        const statusRaw = data.status ?? data.payment_status ?? body.event ?? body.status ?? body.payment_status;
        const status = normalizeStatus(statusRaw);

        const customer = (data.customer as Record<string, unknown>) ?? {};
        const phoneRaw = customer.phone as string | undefined;
        const phone = phoneRaw?.replace(/\D/g, "").replace(/^55/, "");
        const docObj = customer.document as
          | Record<string, unknown>
          | string
          | undefined;
        const document =
          typeof docObj === "string"
            ? docObj
            : (docObj?.number as string | undefined);

        const amount = Number(data.amount ?? 0);

        const result = await processWebhookEvent({
          hash,
          status,
          paymentMethod: String(data.payment_method ?? "pix"),
          amountCents: amount > 0 ? amount : undefined,
          customer: {
            name: customer.name as string | undefined,
            email: customer.email as string | undefined,
            phone,
            document,
          },
          paidAt:
            (data.paid_at as string) ?? (data.approved_at as string) ?? null,
          rawPayload: body,
        });

        console.log("[freepay-webhook]", hash, status, result);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
