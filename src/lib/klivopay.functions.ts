import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OFFER_HASH = "kdgz7sbksb";
const PRODUCT_HASH = "opez6nfwqo";

const trackingSchema = z
  .object({
    utm_source: z.string().max(500).optional(),
    utm_medium: z.string().max(500).optional(),
    utm_campaign: z.string().max(500).optional(),
    utm_content: z.string().max(500).optional(),
    utm_term: z.string().max(500).optional(),
    src: z.string().max(500).optional(),
    sck: z.string().max(500).optional(),
    utmify_pixel: z.string().max(500).optional(),
    fbclid: z.string().max(500).optional(),
    gclid: z.string().max(500).optional(),
  })
  .partial()
  .optional();

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
  tracking: trackingSchema,
});

function getClientIp(): string | null {
  try {
    const req = getRequest();
    const h = req.headers;
    return (
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
      null
    );
  } catch {
    return null;
  }
}

export const createKlivoTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const token = process.env.KLIVOPAY_API_TOKEN;
    if (!token) {
      return { ok: false as const, error: "Pagamento não configurado." };
    }

    const ip = getClientIp();
    const tracking = data.tracking ?? {};

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
            tracking,
            metadata: { client_ip: ip, ...tracking },
          }),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!res.ok || !json || json.success === false) {
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

      const hash = String(json.hash ?? "");
      const amountCents = Number(json.amount ?? data.amount);

      // Persist initial waiting_payment record (tracking will be merged on webhook)
      try {
        const rawPayload = JSON.parse(
          JSON.stringify({
            provider: "klivopay",
            checkout_tracking: tracking,
            tracking,
            metadata: { client_ip: ip },
            customer: { ...data.customer, ip },
            cart,
            initial_response: json,
          }),
        );
        await supabaseAdmin.from("sales").upsert(
          {
            transaction_hash: hash,
            status: "waiting_payment",
            payment_method: "pix",
            amount_cents: amountCents,
            customer_name: data.customer.name,
            customer_email: data.customer.email,
            customer_phone: data.customer.phone,
            customer_document: data.customer.document,
            raw_payload: rawPayload,
          },
          { onConflict: "transaction_hash" },
        );
      } catch (err) {
        console.error("[klivopay] failed to persist sale", err);
      }

      return {
        ok: true as const,
        hash,
        pix_copy_paste: code,
        amount: amountCents,
        expires_at: null,
      };
    } catch (err) {
      console.error("Klivopay request failed", err);
      return { ok: false as const, error: "Não foi possível gerar o Pix." };
    }
  });
