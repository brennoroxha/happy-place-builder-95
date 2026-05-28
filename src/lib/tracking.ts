// Client-side helpers to capture UTM/tracking params from the URL and cookies.
// Used by the checkout to send tracking data to the server alongside the
// payment request (so the server can persist + forward to Utmify).

export type TrackingParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  src?: string;
  sck?: string;
  utmify_pixel?: string;
  fbclid?: string;
  gclid?: string;
};

const KEYS: (keyof TrackingParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "src",
  "sck",
  "fbclid",
  "gclid",
];

const STORAGE_KEY = "slimbelly:tracking";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Capture from current URL + persist to localStorage. Call once on page load. */
export function captureTracking(): TrackingParams {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const captured: TrackingParams = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) captured[k] = v;
  }
  // Merge with any existing stored values (don't overwrite with empty)
  const existing = getStoredTracking();
  const merged: TrackingParams = { ...existing, ...captured };
  if (Object.keys(captured).length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }
  return merged;
}

export function getStoredTracking(): TrackingParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrackingParams;
  } catch {}
  return {};
}

/** Get the full tracking payload (URL + stored + utmify_pixel cookie). */
export function getTracking(): TrackingParams {
  const fromUrl = captureTracking();
  const utmifyCookie =
    readCookie("utmify_pixel") ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("utmify_pixel") || undefined
      : undefined);
  return {
    ...fromUrl,
    ...(utmifyCookie ? { utmify_pixel: utmifyCookie } : {}),
  };
}
