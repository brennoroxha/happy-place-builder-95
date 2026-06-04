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

        // Freepay envia tanto camelCase quanto PascalCase, e às vezes envelopado em "data"
        const dataRaw =
          (Array.isArray((body as any).data)
            ? ((body as any).data[0] as Record<string, unknown>)
            : ((body as any).data as Record<string, unknown>)) ?? body;

        // Normaliza chaves para lowercase para facilitar leitura
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(dataRaw)) data[k.toLowerCase()] = v;
        const top: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(body)) top[k.toLowerCase()] = v;

        const hash = String(
          data.id ??
            data.transaction_id ??
            data.transactionid ??
            data.externalid ??
            data.external_id ??
            top.id ??
            top.hash ??
            top.transaction_id ??
            "",
        );
        if (!hash) {
          console.warn("[freepay-webhook] missing id", JSON.stringify(body));
          return new Response("ok", { status: 200 });
        }

        const statusRaw =
          data.status ??
          data.payment_status ??
          data.paymentstatus ??
          top.event ??
          top.status ??
          top.payment_status;
        const status = normalizeStatus(statusRaw);

        const customerRaw =
          (data.customer as Record<string, unknown>) ??
          (data.Customer as unknown as Record<string, unknown>) ??
          {};
        const customer: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(customerRaw))
          customer[k.toLowerCase()] = v;

        const phoneRaw = customer.phone as string | undefined;
        const phone = phoneRaw?.replace(/\D/g, "").replace(/^55/, "");
        const docObj = customer.document as
          | Record<string, unknown>
          | string
          | undefined;
        const document =
          typeof docObj === "string"
            ? docObj
            : (docObj?.number as string | undefined) ??
              (customer.cpf as string | undefined) ??
              (customer.cnpj as string | undefined);

        // Freepay envia valor em reais (ex: 43.08). Converte para centavos.
        const rawAmount = Number(data.amount ?? 0);
        const amountCents = rawAmount > 0
          ? Number.isInteger(rawAmount) && rawAmount >= 100
            ? rawAmount
            : Math.round(rawAmount * 100)
          : undefined;

        const paidAtRaw =
          (data.paid_at as string) ??
          (data.paidat as string) ??
          (data.approved_at as string) ??
          (data.approvedat as string) ??
          null;
        // Filtra "0001-01-01T00:00:00" que a Freepay envia quando ainda não pago
        const paidAt =
          paidAtRaw && !String(paidAtRaw).startsWith("0001-") ? paidAtRaw : null;

        const result = await processWebhookEvent({
          hash,
          status,
          paymentMethod: String(data.payment_method ?? data.paymentmethod ?? "pix"),
          amountCents,
          customer: {
            name: customer.name as string | undefined,
            email: customer.email as string | undefined,
            phone,
            document,
          },
          paidAt,
          rawPayload: body,
        });

        console.log("[freepay-webhook]", hash, status, result);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
