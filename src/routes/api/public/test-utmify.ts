import { createFileRoute } from "@tanstack/react-router";
import { sendUtmifyOrder, utmifyDate } from "@/lib/utmify.server";

export const Route = createFileRoute("/api/public/test-utmify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const account = url.searchParams.get("account") ?? "panini";
        const tokenEnv =
          account === "panini" ? "UTMIFY_API_TOKEN_PANINI" : "UTMIFY_API_TOKEN";
        const orderId = `test-${Date.now()}`;
        const amountCents = 4308;
        const now = utmifyDate();
        const created = await sendUtmifyOrder({
          orderId,
          status: "waiting_payment",
          paymentMethod: "pix",
          createdAt: now,
          customer: {
            name: "Teste Manual",
            email: "teste@example.com",
            phone: "11999999999",
            document: "00000000000",
            country: "BR",
            ip: null,
          },
          products: [
            { id: "test-1", name: "Teste Purchase", quantity: 1, priceInCents: amountCents },
          ],
          tracking: {},
          totalPriceInCents: amountCents,
          userCommissionInCents: amountCents,
          tokenEnv,
          isTest: true,
        });
        const paid = await sendUtmifyOrder({
          orderId,
          status: "paid",
          paymentMethod: "pix",
          createdAt: now,
          approvedDate: utmifyDate(),
          customer: {
            name: "Teste Manual",
            email: "teste@example.com",
            phone: "11999999999",
            document: "00000000000",
            country: "BR",
            ip: null,
          },
          products: [
            { id: "test-1", name: "Teste Purchase", quantity: 1, priceInCents: amountCents },
          ],
          tracking: {},
          totalPriceInCents: amountCents,
          userCommissionInCents: amountCents,
          tokenEnv,
          isTest: true,
        });
        return Response.json({ orderId, tokenEnv, created, paid });
      },
    },
  },
});
