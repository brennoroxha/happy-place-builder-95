import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendUtmifyOrder, utmifyDate } from "@/lib/utmify.server";

const IRONPAY_POSTBACK_URL =
  "https://happy-place-builder-95.lovable.app/api/public/ironpay-webhook";

const IRONPAY_OFFER_HASH = "uqftytyrci";
const IRONPAY_PRODUCT_HASH = "dhax2fql90";
const IRONPAY_URL = "https://api.ironpayapp.com.br/api/public/v1/transactions";

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

type IronInput = z.infer<typeof inputSchema>;

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

async function runIronTransaction(data: IronInput) {
  const token = process.env.IRONPAY_API_TOKEN;
  if (!token) {
    return { ok: false as const, error: "Pagamento IronPay não configurado." };
  }

  const ip = getClientIp();
  const tracking = data.tracking ?? {};

  const cart = (data.cart ?? [
    { title: "Pedido", quantity: 1, price: data.amount },
  ]).map((i) => ({
    ...i,
    product_hash: IRONPAY_PRODUCT_HASH,
    operation_type: 1,
  }));

  try {
    const res = await fetch(IRONPAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: token,
        amount: data.amount,
        offer_hash: IRONPAY_OFFER_HASH,
        payment_method: "pix",
        postback_url: IRONPAY_POSTBACK_URL,
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
    });

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok || !json || json.success === false) {
      console.error("Ironpay error", res.status, json);
      return {
        ok: false as const,
        error:
          (json && (json.message as string)) ||
          `Falha ao gerar pagamento IronPay (${res.status}).`,
      };
    }

    const pix = (json.pix as Record<string, unknown> | undefined) ?? {};
    const code = String(
      pix.pix_qr_code ?? pix.qr_code ?? pix.copy_paste ?? "",
    );
    if (!code) {
      return { ok: false as const, error: "Pix não retornado pela IronPay." };
    }

    const hash = String(json.hash ?? json.transaction_hash ?? json.id ?? "");
    const amountCents = Number(json.amount ?? data.amount);

    try {
      const rawPayload = JSON.parse(
        JSON.stringify({
          provider: "ironpay",
          scope: data.scope ?? "slimbelly",
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
      console.error("[ironpay] failed to persist sale", err);
    }

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
        products: (data.cart ?? [{ title: "Pedido", quantity: 1, price: amountCents }]).map(
          (c, idx) => ({
            id: `item-${idx + 1}`,
            name: c.title,
            quantity: c.quantity,
            priceInCents: c.price,
          }),
        ),
        tracking: {
          src: tracking.src ?? null,
          sck: tracking.sck ?? null,
          utm_source: tracking.utm_source ?? null,
          utm_campaign: tracking.utm_campaign ?? null,
          utm_medium: tracking.utm_medium ?? null,
          utm_content: tracking.utm_content ?? null,
        },
        totalPriceInCents: amountCents,
        userCommissionInCents: amountCents,
        tokenEnv:
          data.scope === "panini" ? "UTMIFY_API_TOKEN_PANINI" : "UTMIFY_API_TOKEN",
      });
    } catch (err) {
      console.error("[ironpay] utmify waiting_payment failed", err);
    }

    return {
      ok: true as const,
      hash,
      pix_copy_paste: code,
      amount: amountCents,
      expires_at: null,
    };
  } catch (err) {
    console.error("Ironpay request failed", err);
    return { ok: false as const, error: "Não foi possível gerar o Pix." };
  }
}

export const createIronpayTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => runIronTransaction(data));
