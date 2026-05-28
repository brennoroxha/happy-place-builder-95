import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Share2,
  ShoppingCart,
  Bookmark,
  ChevronRight,
  Zap,
  Truck,
  Store,
  MessageCircle,
  Star,
  Grid3x3,
  Ticket,
} from "lucide-react";
import slimBellyBege from "@/assets/slim-belly-bege.png";
import slimBellyPreta from "@/assets/slim-belly-preta.png";
import slimBellyVermelha from "@/assets/slim-belly-vermelha.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cinta Modeladora Slim Belly — Cintura Alta" },
      {
        name: "description",
        content:
          "Cinta Modeladora Slim Belly com cintura alta. Modela, afina e dá conforto. Disponível em 3 cores.",
      },
      { property: "og:title", content: "Cinta Modeladora Slim Belly — Cintura Alta" },
      {
        property: "og:description",
        content:
          "Cinta Modeladora Slim Belly com cintura alta. Modela, afina e dá conforto.",
      },
    ],
  }),
  component: ProductPage,
});

const productImages = [
  slimBellyBege,
  slimBellyPreta,
  slimBellyVermelha,
];

const colorVariants = [
  { name: "Bege", img: slimBellyBege },
  { name: "Preta", img: slimBellyPreta },
  { name: "Vermelha", img: slimBellyVermelha },
];


const customerPhotos = [
  "https://http2.mlstatic.com/D_NQ_NP_2X_721323-MLA82057212384_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_864841-MLA82057212386_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_852531-MLA82057202574_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_620244-MLA81769467358_012025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_733648-MLA83299364440_042025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_989807-MLA82140075200_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_973040-MLA82139913150_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_764956-MLA82139951390_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_881953-MLA82676151265_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_926970-MLA82676151259_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_615687-MLA82391316226_022025-O.webp",
  "https://http2.mlstatic.com/D_NQ_NP_2X_650045-MLA82425876307_022025-O.webp",
];

const reviews = [
  {
    name: "Camilla S.",
    text: "As panelas são maravilhosas. Vieram em perfeito estado e muito bem embaladas. Ainda não as preparei para uso. Assim que usar volto para dar um melhor feedback.",
    photos: [
      "https://http2.mlstatic.com/D_NQ_NP_2X_721323-MLA82057212384_022025-O.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_864841-MLA82057212386_022025-O.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_852531-MLA82057202574_022025-O.webp",
    ],
  },
  {
    name: "Fernanda M.",
    text: "Produto excelente, recomendo!",
    photos: ["https://http2.mlstatic.com/D_NQ_NP_2X_620244-MLA81769467358_012025-O.webp"],
  },
  {
    name: "Juliana R.",
    text: "Demorei muito pra achar a cor, diz que pode em fogão de gás, porém acho que ela são para indução, não manchou no a gás… eu não tenho fogão a indução mas realmente a cor é a quantidade são perfeitas!",
    photos: ["https://http2.mlstatic.com/D_NQ_NP_2X_733648-MLA83299364440_042025-O.webp"],
  },
  {
    name: "Patrícia L.",
    text: "Material muito bom, e são lindas também, amei!",
    photos: [
      "https://http2.mlstatic.com/D_NQ_NP_2X_989807-MLA82140075200_022025-O.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_973040-MLA82139913150_022025-O.webp",
    ],
  },
  {
    name: "Ana Clara D.",
    text: "São maravilhosas, bem grossas e bem bonitas. A cor então é show amei amei.",
    photos: [
      "https://http2.mlstatic.com/D_NQ_NP_2X_881953-MLA82676151265_022025-O.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_926970-MLA82676151259_022025-O.webp",
    ],
  },
  {
    name: "Beatriz C.",
    text: "Lindas, chic no último!!!! Maravilhosas!!!",
    photos: ["https://http2.mlstatic.com/D_NQ_NP_2X_650045-MLA82425876307_022025-O.webp"],
  },
];

function useCountdown(initialSeconds: number) {
  const [s, setS] = useState(initialSeconds);
  useEffect(() => {
    const i = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function ProductPage() {
  const [current, setCurrent] = useState(0);
  const time = useCountdown(573);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur border-b border-zinc-100">
          <button className="p-1"><ChevronLeft className="h-6 w-6" /></button>
          <div className="flex items-center gap-4">
            <Share2 className="h-5 w-5" />
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">0</span>
            </div>
          </div>
        </header>

        {/* Gallery */}
        <div className="relative bg-white">
          <div className="relative aspect-square w-full overflow-hidden">
            <img src={productImages[current]} alt="Jogo De Panelas" className="h-full w-full object-contain" />
            <button onClick={() => setCurrent((c) => (c - 1 + productImages.length) % productImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setCurrent((c) => (c + 1) % productImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{current + 1}/{productImages.length}</span>
          </div>
        </div>

        {/* Price banner */}
        <div className="mt-3 bg-gradient-to-r from-rose-500 to-orange-400 p-4 text-white shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">76%</span>
                <span className="text-2xl font-bold">R$ 61,52</span>
              </div>
              <div className="mt-1 text-xs line-through opacity-80">R$ 548,52</div>
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
            <span className="text-sm font-semibold">Economize R$ 486,49</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Title block */}
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">PROMO 07.05</span>
              <h1 className="mt-2 text-xl font-bold leading-tight">Jogo De Panelas</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  <span className="font-semibold">4.8</span>
                </div>
                <span className="text-sky-600">(982)</span>
                <span>•</span>
                <span>4978 vendidos</span>
              </div>
            </div>
            <Bookmark className="mt-1 h-6 w-6 text-zinc-400" />
          </div>
        </div>

        {/* Shipping */}
        <button className="mx-3 mt-4 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border border-zinc-200 px-3 py-3">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-emerald-600" />
            <div className="text-left">
              <div className="text-sm"><span className="font-semibold text-emerald-600">Frete grátis</span> <span className="text-zinc-700">Receba de 30 de mai até 2 de jun</span></div>
              <div className="mt-0.5 text-xs text-zinc-500">Taxa de envio: <span className="line-through">R$ 9,60</span></div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Colors */}
        <button className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border border-zinc-200 px-3 py-3">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-zinc-500" />
            <div className="flex -space-x-1">
              {colorVariants.map((c) => (
                <img key={c.name} src={c.img} alt={c.name} className="h-9 w-9 rounded-md border-2 border-white object-cover ring-1 ring-zinc-200" />
              ))}
            </div>
            <span className="ml-2 text-sm text-zinc-700">3 opções dispo…</span>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Reviews */}
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Avaliações dos clientes (982)</h2>
            <button className="text-xs text-sky-600">Ver mais</button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-3xl font-bold">4.8</div>
            <div>
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-500" />
                ))}
              </div>
              <div className="text-xs text-zinc-500">de 5</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Fotos dos clientes (31)</span>
              <button className="text-xs text-sky-600">Ver todas as mídias →</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {customerPhotos.map((p, i) => (
                <img key={i} src={p} alt="" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
              ))}
              <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-600">+19</div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-zinc-100">
            {reviews.map((r) => (
              <div key={r.name} className="py-4">
                <div className="flex items-center gap-3">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=eee&color=111&size=64`} alt={r.name} className="h-9 w-9 rounded-full" />
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-700">{r.text}</p>
                {r.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {r.photos.map((p, i) => (
                      <img key={i} src={p} alt="" className="h-16 w-16 rounded-md object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Store reviews */}
        <section className="mt-6 px-4">
          <h2 className="text-base font-bold">Avaliações da loja (1,7 mil)</h2>
          <div className="mt-2 text-xs text-zinc-600">📷 Inclui imagens ou vídeos (367) • 5★ (1,5 mil)</div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-lg font-bold">MS</div>
              <div>
                <div className="text-sm font-semibold">Mimo Style Oficial</div>
                <div className="text-xs text-zinc-500">12.5K vendido(s)</div>
              </div>
            </div>
            <button className="rounded-full border border-sky-500 px-4 py-1.5 text-sm font-semibold text-sky-600">Visitar</button>
          </div>
        </section>

        {/* About */}
        <section className="mt-6 px-4">
          <h2 className="text-base font-bold">Sobre este produto</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <img src="https://http2.mlstatic.com/D_Q_NP_2X_998146-MLA101655638867_122025-F.webp" alt="" className="w-full rounded-lg object-cover" />
            <img src="https://http2.mlstatic.com/D_Q_NP_2X_912945-MLA101156020414_122025-F.webp" alt="" className="w-full rounded-lg object-cover" />
          </div>

          <h3 className="mt-5 text-lg font-bold">Conjunto de Panelas Style Cook</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            Dê um toque de sofisticação à sua cozinha com o <strong>Conjunto de Panelas Style Cook</strong>. Elegância,
            praticidade e tecnologia se unem em um produto ideal para tornar suas experiências culinárias ainda mais
            agradáveis e eficientes.
          </p>

          <h4 className="mt-4 text-sm font-bold">✨ Características</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• <strong>Revestimento Cerâmico:</strong> antiaderente, fácil limpeza.</li>
            <li>• <strong>Fundo de Indução:</strong> compatível com todos os fogões.</li>
            <li>• <strong>Cabos Soft-Touch:</strong> conforto e segurança.</li>
            <li>• <strong>Tampas de Vidro Temperado.</strong></li>
            <li>• <strong>Espessura de 3 mm.</strong></li>
          </ul>

          <h4 className="mt-4 text-sm font-bold">🔥 Benefícios</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• Praticidade no dia a dia</li>
            <li>• Alta durabilidade com design elegante</li>
            <li>• Versátil para qualquer tipo de fogão</li>
            <li>• Economia de tempo e menos uso de óleo</li>
          </ul>

          <h4 className="mt-4 text-sm font-bold">📦 Conteúdo da Embalagem</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• 2 Caçarolas com tampas</li>
            <li>• 2 Panelas com tampas</li>
            <li>• 2 Frigideiras</li>
            <li>• 1 Leiteira</li>
            <li>• 1 Colher de arroz</li>
            <li>• 1 Colher vazada</li>
            <li>• 1 Espátula</li>
          </ul>

          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm">
            <div className="font-semibold text-zinc-800">Garantia do vendedor: 2 anos</div>
          </div>

          <dl className="mt-4 divide-y divide-zinc-100 text-sm">
            {[
              ["Material", "Alumínio com revestimento cerâmico, baquelite, inox e vidro temperado"],
              ["Espessura", "3 mm"],
              ["Cor", "Marmol"],
              ["Marca", "Mimo Style"],
              ["INMETRO", "003005/2022"],
              ["Garantia", "2 anos"],
              ["Compatibilidade", "Fogões a gás, elétricos, vitrocerâmicos e de indução"],
              ["Peças", "10 peças (2 caçarolas, 2 panelas, 2 frigideiras, 1 leiteira, 3 utensílios)"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-zinc-800">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[480px] items-stretch gap-2 px-3 py-2">
          <button className="flex flex-col items-center justify-center px-2 text-[11px] text-zinc-600">
            <Store className="h-5 w-5" /> Loja
          </button>
          <button className="flex flex-col items-center justify-center px-2 text-[11px] text-zinc-600">
            <MessageCircle className="h-5 w-5" /> Chat
          </button>
          <button className="flex-1 rounded-full border border-zinc-300 px-3 text-sm font-semibold text-zinc-800">
            Adicionar ao carrinho
          </button>
          <button className="flex-1 rounded-full bg-rose-500 px-3 py-3 text-sm font-bold text-white shadow">
            Comprar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
