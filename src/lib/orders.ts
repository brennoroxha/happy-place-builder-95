export type OrderStatus = "pending" | "confirmed";

export type Order = {
  hash: string;
  provider: "klivopay" | "freepay";
  total: number;
  code: string;
  createdAt: string; // ISO
  status: OrderStatus;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  proofDataUrl?: string; // base64 image data URL
  proofUploadedAt?: string; // ISO
};

const KEY = "slimbelly:orders";

export function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {}
}

export function upsertOrder(order: Order): void {
  const all = loadOrders();
  const idx = all.findIndex((o) => o.hash === order.hash);
  if (idx >= 0) all[idx] = { ...all[idx], ...order };
  else all.unshift(order);
  saveOrders(all);
}

export function updateOrder(hash: string, patch: Partial<Order>): Order | null {
  const all = loadOrders();
  const idx = all.findIndex((o) => o.hash === hash);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  saveOrders(all);
  return all[idx];
}

export function getOrder(hash: string): Order | null {
  return loadOrders().find((o) => o.hash === hash) ?? null;
}

export function groupByDate(orders: Order[]): { date: string; items: Order[] }[] {
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }));
}

export function isPaymentDeviation(o: Order): boolean {
  return o.status === "pending" && !!o.proofDataUrl;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
