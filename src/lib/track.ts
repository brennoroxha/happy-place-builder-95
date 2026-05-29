// Helpers for client-side analytics events (GA4 + Facebook Pixel).
// Safe to call from anywhere — no-ops on the server and if pixels are absent.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
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
}

export function trackAddToCart(value: number, currency = "BRL") {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "add_to_cart", { currency, value });
  } catch {}
  try {
    window.fbq?.("track", "AddToCart", { value, currency });
  } catch {}
}
