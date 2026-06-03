import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendUtmifyOrder, utmifyDate } from "@/lib/utmify.server";
import { getBaseUrl } from "./utils.server";

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
  scope: z.enum(["slimbelly", "panini"]).optional(),
});

type Item = { qr_code?: string; url?: string; expiration_date?: string };
type ArrOrObj<T> = T | T[] | undefined;

const pick = <T,>(v: ArrOrObj<T>): T | undefined =>
  Array.isArray(v) ? v[0] : v;

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

export const createFreepayTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const pub = process.env.FREEPAY_PUBLIC_KEY;
    const sec = process.env.FREEPAY_SECRET_KEY;
    if (!pub || !sec) {
      return { ok: false as const, error: "Freepay não configurado." };
    }

    const ip = getClientIp();
    const tracking = data.tracking ?? {};

    const items = (data.cart ?? [
      { title: "Pedido", quantity: 1, price: data.amount },
    ]).map((i) => ({
      title: i.title,
      unit_price: i.price,
      quantity: i.quantity,
      tangible: true,
    }));

    const auth = "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");

    try {
      const res = await fetch(
        "https://api.freepaybrasil.com/v1/payment-transaction/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: auth },
          body: JSON.stringify({
            amount: data.amount,
            payment_method: "pix",
            postback_url: `${getBaseUrl()}/api/public/freepay-webhook`,
            customer: {
              name: data.customer.name,
              email: data.customer.email,
              document: { number: data.customer.document, type: "cpf" },
              phone: `+55${data.customer.phone}`,
            },
            items,
            pix: { expires_in_days: 1 },
            metadata: { provider_name: "checkout", client_ip: ip, ...tracking },
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

      const hash = String(root.id ?? "");
      const amountCents = Number(root.amount ?? data.amount);

      try {
        const rawPayload = JSON.parse(
          JSON.stringify({
            provider: "freepay",
            scope: data.scope ?? "slimbelly",
            checkout_tracking: tracking,
            tracking,
            metadata: { client_ip: ip },
            customer: { ...data.customer, ip },
            items,
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
        console.error("[freepay] failed to persist sale", err);
      }

      // Notify Utmify immediately as "waiting_payment" (InitiateCheckout)
      try {
        await sendUtmifyOrder({
          orderId: hash,
          status: "waiting_payment",
          paymentMethod: "pix",
          createdAt: utmifyDate(),
          customer: {
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone,
            document: data.customer.document,
            country: "BR",
            ip,
          },
          products: items.map((c, idx) => ({
            id: `item-${idx + 1}`,
            name: c.title ?? `Item ${idx + 1}`,
            quantity: c.quantity ?? 1,
            priceInCents: c.unit_price ?? amountCents,
          })),
          tracking: {
            src: tracking.src ?? null,
            sck: tracking.sck ?? null,
            utm_source: tracking.utm_source ?? null,
            utm_campaign: tracking.utm_campaign ?? null,
            utm_medium: tracking.utm_medium ?? null,
            utm_content: tracking.utm_content ?? null,
            utm_term: tracking.utm_term ?? null,
          },
          totalPriceInCents: amountCents,
          userCommissionInCents: amountCents,
        });
      } catch (err) {
        console.error("[freepay] utmify waiting_payment failed", err);
      }

      return {
        ok: true as const,
        hash,
        pix_copy_paste: code,
        amount: amountCents,
        expires_at: pixObj?.expiration_date ?? null,
      };
    } catch (err) {
      console.error("Freepay request failed", err);
      return { ok: false as const, error: "Não foi possível gerar o Pix." };
    }
  });
