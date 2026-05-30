// Helpers for client-side analytics events (GA4 + Facebook Pixel).
// Safe to call from anywhere — no-ops on the server and if pixels are absent.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    pixelId?: string;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function trackUtmify(type: "InitiateCheckout" | "Purchase" | "AddToCart") {
  if (typeof window === "undefined" || !window.pixelId) return;
  try {
    const stored = localStorage.getItem("lead");
    const lead = stored ? JSON.parse(stored) : {};
    const payloadLead = {
      ...lead,
      pixelId: window.pixelId,
      userAgent: navigator.userAgent,
      parameters: window.location.search,
      fbp: lead.fbp ?? readCookie("_fbp") ?? readCookie("fbp"),
      fbc: lead.fbc ?? readCookie("_fbc"),
    };

    fetch("https://tracking.utmify.com.br/tracking/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        lead: payloadLead,
        event: {
          sourceUrl: `${window.location.protocol}//${window.location.hostname}${window.location.pathname}`.replace(/\/+$/, ""),
          pageTitle: document.title?.trim() || null,
        },
      }),
      keepalive: true,
    })
      .then((res) => res.json().catch(() => null))
      .then((updatedLead) => {
        if (updatedLead?._id) localStorage.setItem("lead", JSON.stringify(updatedLead));
      })
      .catch(() => {});
  } catch {}
}

export function trackInitiateCheckout(value: number, currency = "BRL") {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "begin_checkout", {
      currency,
      value,
    });
  } catch {}
  try {
    window.fbq?.("track", "InitiateCheckout", {
      value,
      currency,
    });
  } catch {}
  trackUtmify("InitiateCheckout");
}

export function trackPurchase(value: number, transactionId?: string, currency = "BRL") {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "purchase", {
      currency,
      value,
      transaction_id: transactionId,
    });
  } catch {}
  try {
    window.fbq?.("track", "Purchase", {
      value,
      currency,
    });
  } catch {}
  trackUtmify("Purchase");
}

export function trackAddToCart(value: number, currency = "BRL") {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "add_to_cart", { currency, value });
  } catch {}
  try {
    window.fbq?.("track", "AddToCart", { value, currency });
  } catch {}
  trackUtmify("AddToCart");
}
