// Server-only helper: forwards order events to Utmify.
// Called from the gateway webhooks once we know the final status.

type UtmifyStatus = "waiting_payment" | "paid" | "refused" | "refunded" | "chargedback";

export type UtmifyCustomer = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  country?: string;
  ip?: string | null;
};

export type UtmifyProduct = {
  id: string;
  name: string;
  quantity: number;
  priceInCents: number;
  planId?: string | null;
  planName?: string | null;
};

export type UtmifyTracking = {
  src?: string | null;
  sck?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
};

export type SendUtmifyArgs = {
  orderId: string;
  status: UtmifyStatus;
  paymentMethod?: string; // "pix" | "credit_card" | "boleto"
  createdAt: string; // "YYYY-MM-DD HH:mm:ss" UTC
  approvedDate?: string | null;
  customer: UtmifyCustomer;
  products: UtmifyProduct[];
  tracking: UtmifyTracking;
  totalPriceInCents: number;
  userCommissionInCents: number;
  isTest?: boolean;
  /** Override which env var holds the Utmify API token (default UTMIFY_API_TOKEN). */
  tokenEnv?: string;
};

/** Format Date -> "YYYY-MM-DD HH:mm:ss" UTC (Utmify format). */
export function utmifyDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export async function sendUtmifyOrder(args: SendUtmifyArgs): Promise<
  | { ok: true; response: unknown }
  | { ok: false; error: string }
> {
  const token = process.env.UTMIFY_API_TOKEN;
  if (!token) {
    console.warn("[utmify] UTMIFY_API_TOKEN not set, skipping");
    return { ok: false, error: "missing_token" };
  }

  const body = {
    orderId: args.orderId,
    platform: "Lovable",
    paymentMethod: args.paymentMethod ?? "pix",
    status: args.status,
    createdAt: args.createdAt,
    approvedDate: args.status === "paid" ? args.approvedDate ?? utmifyDate() : null,
    refundedAt: null,
    customer: {
      name: args.customer.name ?? null,
      email: args.customer.email ?? null,
      phone: args.customer.phone ?? null,
      document: args.customer.document ?? null,
      country: args.customer.country ?? "BR",
      ip: args.customer.ip ?? null,
    },
    products: args.products.map((p) => ({
      id: p.id,
      name: p.name,
      planId: p.planId ?? null,
      planName: p.planName ?? null,
      quantity: p.quantity,
      priceInCents: p.priceInCents,
    })),
    trackingParameters: {
      src: args.tracking.src ?? null,
      sck: args.tracking.sck ?? null,
      utm_source: args.tracking.utm_source ?? null,
      utm_campaign: args.tracking.utm_campaign ?? null,
      utm_medium: args.tracking.utm_medium ?? null,
      utm_content: args.tracking.utm_content ?? null,
      utm_term: args.tracking.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: args.totalPriceInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: args.userCommissionInCents,
    },
    isTest: args.isTest ?? false,
  };

  try {
    const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": token,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[utmify] error", res.status, json);
      return { ok: false, error: `http_${res.status}` };
    }
    console.log("[utmify] sent", args.orderId, args.status);
    return { ok: true, response: json };
  } catch (err) {
    console.error("[utmify] request failed", err);
    return { ok: false, error: "request_failed" };
  }
}
