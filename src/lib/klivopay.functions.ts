import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OFFER_HASH = "kdgz7sbksb";
const PRODUCT_HASH = "opez6nfwqo";

const inputSchema = z.object({
  amount: z.number().int().positive(),
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(200),
    phone: z.string().regex(/^\d{10,11}$/),
    document: z.string().regex(/^\d{11}$|^\d{14}$/),
  }),
  cart: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        quantity: z.number().int().positive(),
        price: z.number().int().positive(),
      }),
    )
    .optional(),
});

export const createKlivoTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const token = process.env.KLIVOPAY_API_TOKEN;
    if (!token) {
      return { ok: false as const, error: "Pagamento não configurado." };
    }

    const cart = (data.cart ?? [
      { title: "Pedido", quantity: 1, price: data.amount },
    ]).map((i) => ({
      ...i,
      product_hash: PRODUCT_HASH,
      operation_type: 1,
    }));

    try {
      const res = await fetch(
        "https://api.klivopay.com.br/api/public/v1/transactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_token: token,
            amount: data.amount,
            offer_hash: OFFER_HASH,
            payment_method: "pix",
            customer: {
              name: data.customer.name,
              email: data.customer.email,
              phone_number: data.customer.phone,
              document: data.customer.document,
            },
            cart,
          }),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!res.ok || !json || (json.success === false)) {
        console.error("Klivopay error", res.status, json);
        return {
          ok: false as const,
          error:
            (json && (json.message as string)) ||
            `Falha ao gerar pagamento (${res.status}).`,
        };
      }

      const pix = (json.pix as Record<string, unknown> | undefined) ?? {};
      const code = String(pix.pix_qr_code ?? "");
      if (!code) {
        return { ok: false as const, error: "Pix não retornado pela API." };
      }

      return {
        ok: true as const,
        hash: String(json.hash ?? ""),
        pix_copy_paste: code,
        amount: Number(json.amount ?? data.amount),
        expires_at: null,
      };
    } catch (err) {
      console.error("Klivopay request failed", err);
      return { ok: false as const, error: "Não foi possível gerar o Pix." };
    }
  });
