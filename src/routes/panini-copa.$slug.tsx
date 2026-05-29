import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft, Share2, ShoppingCart, Bookmark, ChevronRight,
  Zap, Truck, Store, MessageCircle, Star, Ticket, ShieldCheck, LayoutGrid, Video,
} from "lucide-react";
import { paniniBySlug, type PaniniProduct } from "@/lib/panini-products";
import { PaniniCartProvider, usePaniniCart } from "@/lib/panini-cart";
import { CartDrawer } from "@/components/panini/CartDrawer";

export const Route = createFileRoute("/panini-copa/$slug")({
  loader: ({ params }) => {
    const product = paniniBySlug[params.slug];
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.titulo} — Panini Copa` },
          { name: "description", content: loaderData.product.descricao.slice(0, 160) },
          { property: "og:title", content: loaderData.product.titulo },
          { property: "og:description", content: loaderData.product.descricao.slice(0, 160) },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-zinc-100 text-zinc-700">
      Produto não encontrado.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-zinc-100 text-zinc-700">
      Erro ao carregar produto: {String(error)}
    </div>
  ),
  component: PaniniProductRoot,
});

function PaniniProductRoot() {
  return (
    <PaniniCartProvider>
      <PaniniProductPage />
      <CartDrawer />
    </PaniniCartProvider>
  );
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useCountdown(initial: number) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const i = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function PaniniProductPage() {
  const navigate = useNavigate();
  const { product } = Route.useLoaderData() as { product: PaniniProduct };
  const [current, setCurrent] = useState(0);
  const time = useCountdown(573);
  const { add, count, setOpen } = usePaniniCart();

  const monthsAbbr = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const fmt = (d: Date) => `${d.getDate()} de ${monthsAbbr[d.getMonth()]}`;
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() + 2);
  const end = new Date(today); end.setDate(today.getDate() + 4);
  const deliveryRange = `${fmt(start)} até ${fmt(end)}`;

  const images = product.fotos.length ? product.fotos : [];
  const economiza = product.precoComparacao - product.preco;
  const cover = images[0] ?? "";

  const addToCart = () => {
    add({ slug: product.slug, name: product.titulo, price: product.preco, img: cover });
    setOpen(true);
  };
  const goCheckout = () => {
    add({ slug: product.slug, name: product.titulo, price: product.preco, img: cover });
    navigate({ to: "/checkout", search: { color: product.titulo, size: "Único" } });
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 sm:py-6">
      <div className="mx-auto max-w-[480px] bg-white pb-28 sm:rounded-2xl sm:shadow-xl sm:ring-1 sm:ring-zinc-200 sm:overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <button className="p-1" onClick={() => navigate({ to: "/panini-copa" })}>
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="text-base font-bold tracking-tight text-rose-600">Panini</span>
          </div>
          <div className="flex items-center gap-4">
            <Share2 className="h-5 w-5" />
            <button onClick={() => setOpen(true)} className="relative" aria-label="Abrir carrinho">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{count}</span>
              )}
            </button>
          </div>
        </header>

        {/* Gallery */}
        {images.length > 0 && (
          <div className="relative bg-white">
            <div
              className="relative aspect-square w-full overflow-hidden touch-pan-y"
              onTouchStart={(e) => { (e.currentTarget as unknown as { _tx: number })._tx = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const startX = (e.currentTarget as unknown as { _tx?: number })._tx;
                if (startX == null) return;
                const dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 40) {
                  setCurrent((c) => dx < 0
                    ? (c + 1) % images.length
                    : (c - 1 + images.length) % images.length);
                }
              }}
            >
              <img src={images[current]} alt={product.titulo} draggable={false} className="h-full w-full object-contain select-none bg-zinc-50" />
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setCurrent((c) => (c + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{current + 1}/{images.length}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Price banner */}
        <div className="bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-2 text-white shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">{product.desconto}%</span>
                <span className="text-3xl font-bold">{brl(product.preco)}</span>
              </div>
              <div className="mt-1 text-xs line-through opacity-80">{brl(product.precoComparacao)}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-semibold">
                <Zap className="h-4 w-4 fill-white" /> Oferta Relâmpago
              </div>
              <div className="mt-1 text-sm">Termina em <span className="font-bold tabular-nums">{time}</span></div>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <button className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl bg-rose-50 px-3 py-3 text-rose-600">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            <span className="text-sm font-semibold">Economize {brl(economiza)}</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mt-2 text-xl font-bold leading-tight">{product.titulo}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  <span className="font-semibold">{product.notas.toFixed(1)}</span>
                </div>
                <span className="text-sky-600">({product.comentarios.length * 200 + 82})</span>
                <span>•</span>
                <span>{product.vendidos.toLocaleString("pt-BR")} vendidos</span>
              </div>
            </div>
            <Bookmark className="mt-1 h-6 w-6 text-zinc-400" />
          </div>
        </div>

        {/* Shipping + Devoluções + Opções */}
        <div className="mx-3 mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* Frete grátis */}
          <div className="flex items-start gap-2 px-4 py-3">
            <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-700" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-500">frete grátis</span>
                <span className="text-[12px] text-zinc-900">Receba {deliveryRange}</span>
              </div>
              <div className="mt-0.5 ml-0 text-[11px] text-zinc-400 line-through">Taxa de envio: R$ 20,90</div>
            </div>
          </div>

          <div className="h-px bg-zinc-100" />

          {/* Devoluções */}
          <div className="flex items-center gap-2 px-4 py-3">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-zinc-700" />
            <div className="text-[12px] text-zinc-900">Devoluções gratuitas em 30 dias • Cancelamento fácil</div>
          </div>

          <div className="h-px bg-zinc-100" />

          {/* Opções disponíveis */}
          <button onClick={goCheckout} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <LayoutGrid className="h-4 w-4 flex-shrink-0 text-zinc-500" />
            <div className="flex gap-1.5">
              {images.slice(0, 4).map((src, i) => (
                <img key={i} src={src} alt="" className="h-7 w-7 rounded-md border border-zinc-200 object-cover" />
              ))}
            </div>
            <span className="ml-1 text-[14px] text-zinc-500">{Math.max(images.length, 1)} opções disponíveis</span>
            <ChevronRight className="ml-auto h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Reviews */}
        {product.comentarios.length > 0 && (
          <section className="mt-6 px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Avaliações dos clientes</h2>
              <button className="text-xs text-sky-600">Ver mais</button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-3xl font-bold">{product.notas.toFixed(1)}</div>
              <div>
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
                <div className="text-xs text-zinc-500">de 5</div>
              </div>
            </div>

            <div className="mt-4 divide-y divide-zinc-100">
              {product.comentarios.map((r, idx) => (
                <div key={idx} className="py-4">
                  <div className="flex items-center gap-3">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.nome)}&background=eee&color=111&size=64`} alt={r.nome} className="h-9 w-9 rounded-full" />
                    <div>
                      <div className="text-sm font-semibold">{r.nome}</div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: r.nota }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{r.texto}</p>
                  {r.fotos.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {r.fotos.map((p, i) => (
                        <img key={i} src={p} alt="" className="h-16 w-16 rounded-md object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vídeos dos criadores */}
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-zinc-900" />
              <h2 className="text-base font-bold">Vídeos dos criadores</h2>
            </div>
            <span className="text-[11px] text-zinc-500">Conteúdo enviado por quem testou</span>
          </div>
          <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Nenhum vídeo de criador disponível no momento.
          </div>
        </section>


        {/* Store */}
        <section className="mt-6 px-4">
          <h2 className="text-base font-bold">Loja oficial</h2>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-600 text-lg font-bold text-white">P</div>
              <div>
                <div className="text-sm font-semibold">Panini — Album 2026</div>
                <div className="text-xs text-zinc-500">99.176 vendido(s)</div>
              </div>
            </div>
            <button onClick={() => navigate({ to: "/panini-copa" })} className="rounded-full border border-sky-500 px-4 py-1.5 text-sm font-semibold text-sky-600">Visitar</button>
          </div>
        </section>

        {/* About */}
        {product.descricao && (
          <section className="mt-6 px-4">
            <h2 className="text-base font-bold">Sobre este produto</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">{product.descricao}</p>

            <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm">
              <div className="font-semibold text-zinc-800">Garantia do vendedor: 90 dias</div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[480px] items-center gap-3 px-3 py-2">
          <button onClick={() => navigate({ to: "/panini-copa" })} className="flex flex-col items-center justify-center text-[11px] text-zinc-700">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
          <button className="flex flex-col items-center justify-center text-[11px] text-zinc-700">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={addToCart}
            className="ml-auto flex-1 rounded-full border-2 border-rose-600 py-2.5 text-sm font-bold text-rose-600"
          >
            Adicionar
          </button>
          <button
            onClick={goCheckout}
            className="flex-1 rounded-full bg-rose-600 py-3 text-sm font-bold text-white shadow-sm"
          >
            Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
}
