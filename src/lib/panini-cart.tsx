import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PaniniCartItem = {
  slug: string;
  name: string;
  price: number;
  img: string;
  qty: number;
};

type CartCtx = {
  items: PaniniCartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<PaniniCartItem, "qty">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "panini:cart";

export function PaniniCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PaniniCartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return {
      items,
      count,
      subtotal,
      open,
      setOpen,
      add: (item, qty = 1) => {
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.slug === item.slug);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], qty: next[idx].qty + qty };
            return next;
          }
          return [...prev, { ...item, qty }];
        });
      },
      remove: (slug) => setItems((prev) => prev.filter((p) => p.slug !== slug)),
      setQty: (slug, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.slug !== slug)
            : prev.map((p) => (p.slug === slug ? { ...p, qty } : p))
        ),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePaniniCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePaniniCart must be used inside <PaniniCartProvider>");
  return c;
}
