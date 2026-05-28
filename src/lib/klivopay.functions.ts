import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OFFER_HASH = "kdgz7sbksb";

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
        name: z.string().min(1).max(200),
        quantity: z.number().int().positive(),
        unit_price: z.number().int().positive(),
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
            customer: data.customer,
            cart: data.cart,
          }),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: Record<string, unknown>; message?: string }
        | null;

      if (!res.ok || !json?.success || !json.data) {
        console.error("Klivopay error", res.status, json);
        return {
          ok: false as const,
          error:
            (json && (json.message as string)) ||
            `Falha ao gerar pagamento (${res.status}).`,
        };
      }

      const d = json.data as Record<string, unknown>;
      return {
        ok: true as const,
        hash: String(d.hash ?? ""),
        pix_copy_paste: String(d.pix_copy_paste ?? d.pix_qr_code ?? ""),
        amount: Number(d.amount ?? data.amount),
        expires_at: d.expires_at ? String(d.expires_at) : null,
      };
    } catch (err) {
      console.error("Klivopay request failed", err);
      return { ok: false as const, error: "Não foi possível gerar o Pix." };
    }
  });
