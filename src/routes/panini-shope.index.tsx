import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Share2, ShoppingCart, Ticket, ShoppingBag } from "lucide-react";
import paniniLogo from "@/assets/panini/logo.webp";
import p1 from "@/assets/panini/p1.jpg";
import p2 from "@/assets/panini/p2.png";
import p3 from "@/assets/panini/p3.png";
import p4 from "@/assets/panini/p4.png";
import p5 from "@/assets/panini/p5.png";
import p6 from "@/assets/panini/p6.png";
import p7 from "@/assets/panini/p7.png";
import p8 from "@/assets/panini/p8.png";
import p9 from "@/assets/panini/p9.png";
import p10 from "@/assets/panini/p10.png";
import { PaniniCartProvider, usePaniniCart } from "@/lib/panini-cart";
import { CartDrawer } from "@/components/panini/CartDrawer";
import { shopeeLogo } from "@/assets/external";

export const Route = createFileRoute("/panini-shope/")({
  head: () => ({
    meta: [
      { title: "Álbum 2026 — Shopee" },
      { name: "description", content: "Álbum 2026, figurinhas e envelopes Panini na Shopee." },
    ],
  }),
  component: PaniniShopeRoot,
});

type Product = {
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  img: string;
};

const products: Product[] = [
  { name: "Combo 2000 figurinhas [Revenda Atacado] 🔥", slug: "combo-2000-figurinhas-revenda-atacado", price: 152.9, oldPrice: 670.0, img: p1 },
  { name: "Kit Com 650 Envelopes", slug: "kit-com-650-envelopes", price: 62.06, oldPrice: 494.9, img: p2 },
  { name: "Kit Com 400 Envelopes", slug: "kit-com-400-envelopes", price: 43.08, oldPrice: 394.9, img: p3 },
  { name: "Álbum 2026", slug: "album-2026", price: 31.43, oldPrice: 74.9, img: p4 },
  { name: "Kit Com 200 Envelopes", slug: "kit-com-200-envelopes", price: 29.93, oldPrice: 194.9, img: p5 },
  { name: "Álbum Dourado Capa Dura", slug: "album-dourado-capa-dura", price: 25.31, oldPrice: 74.9, img: p6 },
  { name: "Álbum Prata Capa Dura", slug: "album-prata-capa-dura", price: 24.08, oldPrice: 74.9, img: p7 },
  { name: "Kit Com 100 Envelopes", slug: "kit-com-100-envelopes", price: 21.05, oldPrice: 74.9, img: p8 },
  { name: "Álbum Tradicional Capa Dura", slug: "album-tradicional-capa-dura", price: 20.77, oldPrice: 74.9, img: p9 },
  { name: "Álbum Tradicional Capa Mole", slug: "album-tradicional-capa-mole", price: 14.29, oldPrice: 74.9, img: p10 },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useCountdown(initial: number) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const i = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function PaniniShopeRoot() {
  return (
    <PaniniCartProvider>
      <PaniniShopePage />
      <CartDrawer checkoutPath="/panini-shope-checkout" />
    </PaniniCartProvider>
  );
}

const SHOPEE = "#ee4d2d";

function PaniniShopePage() {
  const navigate = useNavigate();
  const time = useCountdown(19 * 60 + 49);
  const [tab, setTab] = useState<"inicio" | "produtos" | "categorias">("produtos");
  const [following, setFollowing] = useState(false);
  const [freteAtivo, setFreteAtivo] = useState(false);
  const [sort, setSort] = useState<"recomendado" | "vendidos" | "lancamentos" | "preco-asc" | "preco-desc">("recomendado");
  const { add, count, setOpen } = usePaniniCart();

  const handleAdd = (p: Product) => {
    add({ slug: p.slug, name: p.name, price: p.price, img: p.img });
    setOpen(true);
  };

  const visibleProducts: Product[] = (() => {
    const list = [...products];
    switch (sort) {
      case "vendidos": return list.sort((a, b) => b.oldPrice - a.oldPrice);
      case "lancamentos": return list.reverse();
      case "preco-asc": return list.sort((a, b) => a.price - b.price);
      case "preco-desc": return list.sort((a, b) => b.price - a.price);
      default: return list;
    }
  })();

  return (
    <div className="min-h-screen bg-zinc-100 text-sm text-zinc-800 sm:py-6">
      <div className="mx-auto max-w-[480px] bg-white pb-10 sm:rounded-2xl sm:shadow-xl sm:ring-1 sm:ring-zinc-200 sm:overflow-hidden">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 text-white"
          style={{ backgroundColor: SHOPEE }}
        >
          <div className="flex items-center gap-2">
            <button className="p-1" aria-label="Voltar"><ChevronLeft className="h-6 w-6" /></button>
            <img
              src={shopeeLogo}
              alt="Shopee"
              className="h-7 w-auto brightness-0 invert"
            />
          </div>
          <div className="flex items-center gap-4">
            <Share2 className="h-5 w-5" />
            <button onClick={() => setOpen(true)} className="relative" aria-label="Abrir carrinho">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-bold" style={{ color: SHOPEE }}>{count}</span>
            </button>
          </div>
        </header>

        {/* Store header */}
        <section className="bg-white">
          <div
            className="px-4 pb-4 pt-5 text-white"
            style={{ background: `linear-gradient(135deg, ${SHOPEE}, #f76c4f)` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={paniniLogo} alt="Panini" className="h-16 w-16 rounded-full border-2 border-white object-cover" />
                <div className="leading-tight">
                  <div className="text-base font-semibold">Album 2026</div>
                  <div className="text-[12px] opacity-90">99.176 vendido(s)</div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online agora
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setFollowing((f) => !f)}
                  className={`w-[92px] rounded-md px-4 py-1.5 text-xs font-semibold ${
                    following ? "bg-white/30 text-white" : "bg-white text-[color:var(--sh)]"
                  }`}
                  style={{ ["--sh" as any]: SHOPEE }}
                >
                  {following ? "Seguindo" : "+ Seguir"}
                </button>
                <button className="w-[92px] rounded-md border border-white/70 px-4 py-1.5 text-xs font-semibold">Mensagem</button>
              </div>
            </div>
          </div>

          {/* Frete promo card */}
          <div className="px-4 pt-3 pb-2">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold tracking-wide" style={{ color: SHOPEE }}>OFERTA TERMINA EM</span>
                <span className="rounded-full px-3 py-1 text-xs font-bold text-white tabular-nums" style={{ backgroundColor: SHOPEE }}>{time}</span>
              </div>
              <div className="mt-2 text-sm text-zinc-700">Frete grátis liberado no checkout!</div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-orange-200">
                <div className="h-full w-full" style={{ background: `linear-gradient(to right, ${SHOPEE}, #ffb199)` }} />
              </div>
              <div className="mt-2 text-[12px] text-zinc-500">R$ 152,90 / R$ 120,00</div>
              <button
                onClick={() => setFreteAtivo(true)}
                className="mt-3 w-full rounded-full py-2.5 text-sm font-bold text-white shadow"
                style={{ backgroundColor: freteAtivo ? "#3f3f46" : SHOPEE }}
              >
                {freteAtivo ? "Frete grátis ativado" : "Resgatar Frete Grátis"}
              </button>
            </div>
          </div>

          <div className="h-[5px] w-full bg-zinc-100" />
        </section>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="flex text-center text-sm">
            {([
              ["inicio", "Página inicial"],
              ["produtos", "Produtos"],
              ["categorias", "Categorias"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="w-full py-2.5"
                style={tab === key ? { color: SHOPEE, borderBottom: `2px solid ${SHOPEE}`, fontWeight: 700 } : { color: "#71717a" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "categorias" ? (
          <div className="flex min-h-[500px] flex-col items-center justify-center bg-white px-4 py-20">
            <div className="mb-4 text-6xl">📦</div>
            <div className="text-lg font-bold text-zinc-900">Em breve</div>
            <div className="mt-1 text-center text-sm text-zinc-500">As categorias estarão disponíveis em breve.</div>
          </div>
        ) : tab === "inicio" ? (
          <div className="bg-white px-3 py-3 space-y-5">
            {([
              ["Principais produtos", "Ver mais"],
              ["Recomendado para você", "Mais"],
            ] as const).map(([titulo, link], idx) => (
              <div key={titulo}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-zinc-900">{titulo}</h3>
                  <button onClick={() => setTab("produtos")} className="text-xs" style={{ color: SHOPEE }}>
                    {link} ›
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {visibleProducts.slice(idx * 2, idx * 2 + 4).map((p, i) => (
                    <div key={i} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-2">
                      <button
                        onClick={() => navigate({ to: "/panini-shope/$slug", params: { slug: p.slug } })}
                        className="mb-2 aspect-square w-full"
                      >
                        <img src={p.img} alt={p.name} className="h-full w-full object-contain" />
                      </button>
                      <button
                        onClick={() => navigate({ to: "/panini-shope/$slug", params: { slug: p.slug } })}
                        className="flex flex-col gap-1 text-left"
                      >
                        <div className="line-clamp-2 text-xs font-semibold text-zinc-900">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: SHOPEE }}>60% OFF</span>
                          <span className="rounded border border-orange-300 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: SHOPEE }}>Frete grátis</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold leading-tight" style={{ color: SHOPEE }}>{brl(p.price)}</div>
                          <div className="text-[11px] text-zinc-400 line-through">{brl(p.oldPrice)}</div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex items-center px-3 py-2 text-sm">
              <div className="flex w-[95%] gap-3 overflow-x-auto scrollbar-hide">
                {([
                  ["recomendado", "Recomendado"],
                  ["vendidos", "Mais vendidos"],
                  ["lancamentos", "Lançamentos"],
                ] as const).map(([key, label], i, arr) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={`whitespace-nowrap px-2 ${i < arr.length ? "border-r border-zinc-200" : ""}`}
                    style={sort === key ? { color: SHOPEE, fontWeight: 600 } : { color: "#71717a" }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setSort(sort === "preco-asc" ? "preco-desc" : "preco-asc")}
                  className="whitespace-nowrap px-2"
                  style={sort === "preco-asc" || sort === "preco-desc" ? { color: SHOPEE, fontWeight: 600 } : { color: "#71717a" }}
                >
                  Preço {sort === "preco-asc" ? "↑" : "↓"}
                </button>
              </div>
              <button className="ml-2 pr-2 text-lg text-zinc-900" aria-label="Alternar visualização">☰</button>
            </div>

            {/* Products list */}
            <div className="flex flex-col items-center space-y-3 bg-white p-3">
              {visibleProducts.map((p, i) => (
                <div key={i} className="flex w-full max-w-[500px] flex-row rounded-lg bg-white">
                  <button
                    onClick={() => navigate({ to: "/panini-shope/$slug", params: { slug: p.slug } })}
                    className="mr-3 flex-shrink-0"
                    style={{ width: 110, height: 120 }}
                  >
                    <img src={p.img} alt={p.name} className="h-full w-full object-contain" />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col justify-between pb-2" style={{ minHeight: 120 }}>
                    <button
                      onClick={() => navigate({ to: "/panini-shope/$slug", params: { slug: p.slug } })}
                      className="flex flex-1 flex-col justify-center gap-0.5 text-left"
                    >
                      <div className="truncate text-xs font-semibold text-zinc-900">{p.name}</div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span
                          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold text-white"
                          style={{ backgroundColor: SHOPEE }}
                        >
                          <Ticket className="h-3 w-3" />
                          60% OFF
                        </span>
                        <span
                          className="rounded border px-2 py-0.5 text-[11px] font-bold"
                          style={{ color: SHOPEE, borderColor: "#fed7aa" }}
                        >
                          Frete grátis
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600">
                        <span className="text-yellow-400">★</span>
                        <span>5 | 4312 vendido(s)</span>
                      </div>
                    </button>
                    <div className="mt-1 flex flex-row items-end justify-between">
                      <button
                        onClick={() => navigate({ to: "/panini-shope/$slug", params: { slug: p.slug } })}
                        className="flex flex-col text-left"
                      >
                        <span className="text-base font-bold leading-tight" style={{ color: SHOPEE }}>{brl(p.price)}</span>
                        <span className="text-xs text-zinc-400 line-through">{brl(p.oldPrice)}</span>
                      </button>
                      <div className="ml-2 flex items-center">
                        <button
                          onClick={() => handleAdd(p)}
                          aria-label="Adicionar ao carrinho"
                          className="grid h-8 place-items-center px-3 text-white"
                          style={{ backgroundColor: "#f97316", borderRadius: "8px 0 0 8px" }}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleAdd(p)}
                          className="flex h-8 items-center px-3 text-[12px] font-semibold text-white"
                          style={{ backgroundColor: SHOPEE, borderRadius: "0 8px 8px 0" }}
                        >
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
