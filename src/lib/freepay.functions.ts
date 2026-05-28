import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

type Item = { qr_code?: string; url?: string; expiration_date?: string };
type ArrOrObj<T> = T | T[] | undefined;

const pick = <T,>(v: ArrOrObj<T>): T | undefined =>
  Array.isArray(v) ? v[0] : v;

export const createFreepayTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const pub = process.env.FREEPAY_PUBLIC_KEY;
    const sec = process.env.FREEPAY_SECRET_KEY;
    if (!pub || !sec) {
      return { ok: false as const, error: "Freepay não configurado." };
    }

    const items = (data.cart ?? [
      { title: "Pedido", quantity: 1, price: data.amount },
    ]).map((i) => ({
      title: i.title,
      unit_price: i.price,
      quantity: i.quantity,
      tangible: true,
    }));

    const auth =
      "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");

    try {
      const res = await fetch(
        "https://api.freepaybrasil.com/v1/payment-transaction/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth,
          },
          body: JSON.stringify({
            amount: data.amount,
            payment_method: "pix",
            postback_url: "https://example.com/webhook",
            customer: {
              name: data.customer.name,
              email: data.customer.email,
              document: { number: data.customer.document, type: "cpf" },
              phone: `+55${data.customer.phone}`,
            },
            items,
            pix: { expires_in_days: 1 },
            metadata: JSON.stringify({ provider_name: "checkout" }),
          }),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!res.ok || !json) {
        console.error("Freepay error", res.status, json);
        return {
          ok: false as const,
          error:
            (json && (json.message as string)) ||
            `Falha ao gerar pagamento (${res.status}).`,
        };
      }

      const root = (pick(json.data as ArrOrObj<Record<string, unknown>>) ??
        json) as Record<string, unknown>;
      const pixObj = pick(root.pix as ArrOrObj<Item>);
      const code = String(pixObj?.qr_code ?? "");

      if (!code) {
        console.error("Freepay: missing pix code", json);
        return { ok: false as const, error: "Pix não retornado pela API." };
      }

      return {
        ok: true as const,
        hash: String(root.id ?? ""),
        pix_copy_paste: code,
        amount: Number(root.amount ?? data.amount),
        expires_at: pixObj?.expiration_date ?? null,
      };
    } catch (err) {
      console.error("Freepay request failed", err);
      return { ok: false as const, error: "Não foi possível gerar o Pix." };
    }
  });
