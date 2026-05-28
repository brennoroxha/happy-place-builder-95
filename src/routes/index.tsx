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
  Ticket,
  X,
} from "lucide-react";
import slimBellyBege from "@/assets/slim-belly-bege.png";
import slimBellyPreta from "@/assets/slim-belly-preta.png";
import slimBellyVermelha from "@/assets/slim-belly-vermelha.png";
import slimBellyCostas from "@/assets/slim-belly-costas.png";
import slimBellyPretaUso from "@/assets/slim-belly-preta-uso.png";
import slimBellyBegeUso from "@/assets/slim-belly-bege-uso.png";

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
  slimBellyPretaUso,
  slimBellyBegeUso,
  slimBellyCostas,
];

const colorVariants = [
  { name: "Bege", img: slimBellyBege },
  { name: "Preta", img: slimBellyPreta },
  { name: "Vermelha", img: slimBellyVermelha },
];

const sizes = ["P", "M", "G", "GG", "XG", "XXG", "G2"];


import review1 from "@/assets/review-1.png";
import review2 from "@/assets/review-2.png";
import review3 from "@/assets/review-3.png";
import review4 from "@/assets/review-4.png";
import review5 from "@/assets/review-5.png";
import review6 from "@/assets/review-6.png";
import review7 from "@/assets/review-7.png";
import review8 from "@/assets/review-8.png";
import review9 from "@/assets/review-9.png";
import review10 from "@/assets/review-10.png";
import reviewNew1 from "@/assets/review-new-1.png";
import reviewNew2 from "@/assets/review-new-2.png";
import reviewNew3 from "@/assets/review-new-3.png";
import reviewNew4 from "@/assets/review-new-4.png";

const customerPhotos = [
  reviewNew1, reviewNew2, reviewNew3, reviewNew4,
  review1, review2, review3, review4, review5,
  review6, review7, review8, review9, review10,
];

const reviews = [
  {
    name: "Camilla S.",
    text: "Chegou super rápido e bem embalada. O tecido é firme, comprime bem a barriga e não marca a roupa. Estou amando!",
    photos: [reviewNew1, reviewNew2, reviewNew3],
  },
  {
    name: "Fernanda M.",
    text: "Produto excelente, recomendo! Modela muito bem e é super confortável pra usar o dia todo, mesmo no calor.",
    photos: [reviewNew4, review1, review2],
  },
  {
    name: "Juliana R.",
    text: "Demorei pra achar o tamanho certo, mas vale muito a pena. A compressão é alta e o efeito favo de mel faz diferença mesmo.",
    photos: [review3, review4, review5],
  },
  {
    name: "Beatriz C.",
    text: "Veio bem embalada e idêntica às fotos. Qualidade ótima pelo preço, já comprei outra cor!",
    photos: [review6, review7, review8],
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const selectionLabel =
    selectedColor && selectedSize
      ? `${selectedColor}, ${selectedSize}`
      : "Selecionar opções";

  const monthsAbbr = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const fmt = (d: Date) => `${d.getDate()} de ${monthsAbbr[d.getMonth()]}`;
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() + 2);
  const end = new Date(today); end.setDate(today.getDate() + 4);
  const deliveryRange = `${fmt(start)} até ${fmt(end)}`;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <button className="p-1"><ChevronLeft className="h-6 w-6" /></button>
            <img
              src="https://sf16-website.neutral.ttwstatic.com/obj/tiktok_web_static/i18n_ecom_fe/tiktok_shop_web_mono/packages/apps/pdp_h5/static/image/tts-logo-light.28ce4ad8.png"
              alt="TikTok Shop"
              className="h-10 w-auto"
            />
          </div>
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
            <img src={productImages[current]} alt="Cinta Modeladora Slim Belly" className="h-full w-full object-contain" />
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
              <h1 className="mt-2 text-xl font-bold leading-tight">Cinta Modeladora Slim Belly — Cintura Alta</h1>
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
              <div className="text-sm"><span className="font-semibold text-emerald-600">Frete grátis</span> <span className="text-zinc-700">Receba de {deliveryRange}</span></div>
              <div className="mt-0.5 text-xs text-zinc-500">Taxa de envio: <span className="line-through">R$ 9,60</span></div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Selecionar opções */}
        <button
          onClick={() => setPickerOpen(true)}
          className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border border-zinc-200 px-3 py-3"
        >
          <span className="text-sm font-bold text-zinc-900">{selectionLabel}</span>
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
              <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-lg font-bold">SB</div>
              <div>
                <div className="text-sm font-semibold">Slim Belly</div>
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
            <img src={slimBellyPretaUso} alt="Slim Belly Preta em uso" className="w-full rounded-lg object-cover" />
            <img src={slimBellyBegeUso} alt="Slim Belly Bege em uso" className="w-full rounded-lg object-cover" />
            <img src={slimBellyCostas} alt="Slim Belly visão traseira" className="w-full rounded-lg object-cover" />
            <img src={slimBellyBege} alt="Slim Belly Bege" className="w-full rounded-lg object-cover" />
          </div>

          <h3 className="mt-5 text-lg font-bold">Cinta Modeladora Slim Belly</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            A <strong>Cinta Modeladora Slim Belly</strong> de cintura alta foi desenvolvida para modelar o abdômen,
            afinar a cintura e dar suporte à postura. Tecido respirável com tecnologia de pontos em favo de mel para
            conforto o dia todo, sob qualquer roupa.
          </p>

          <h4 className="mt-4 text-sm font-bold">✨ Características</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• <strong>Cintura Alta:</strong> modela barriga e cintura.</li>
            <li>• <strong>Tecnologia Favo de Mel:</strong> massagem e compressão.</li>
            <li>• <strong>Tecido Respirável:</strong> não marca a roupa.</li>
            <li>• <strong>Costura Sem Emenda:</strong> conforto invisível.</li>
            <li>• <strong>Alta Compressão:</strong> efeito modelador imediato.</li>
          </ul>

          <h4 className="mt-4 text-sm font-bold">🔥 Benefícios</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• Afina a cintura instantaneamente</li>
            <li>• Melhora a postura</li>
            <li>• Disfarça gordurinhas localizadas</li>
            <li>• Conforto para usar o dia todo</li>
          </ul>

          <h4 className="mt-4 text-sm font-bold">📦 Conteúdo da Embalagem</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>• 1 Cinta Modeladora Slim Belly</li>
          </ul>

          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm">
            <div className="font-semibold text-zinc-800">Garantia do vendedor: 90 dias</div>
          </div>

          <dl className="mt-4 divide-y divide-zinc-100 text-sm">
            {[
              ["Material", "Poliamida e elastano"],
              ["Modelo", "Cintura alta"],
              ["Cores", "Bege, Preta e Vermelha"],
              ["Tamanhos", "P, M, G, GG"],
              ["Compressão", "Alta"],
              ["Garantia", "90 dias"],
              ["Indicação", "Uso diário, pós-parto, academia"],
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
        <div className="mx-auto flex max-w-[480px] px-3 py-2">
          <button className="w-full rounded-full bg-rose-500 px-3 py-4 text-base font-bold text-white shadow">
            Comprar Agora
          </button>
        </div>
      </div>


      {/* Bottom sheet: opções */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={() => setPickerOpen(false)}>
          <div
            className="w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-zinc-100 p-4">
              <img src={productImages[current]} alt="" className="h-16 w-16 rounded-lg border border-zinc-200 object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-rose-500">R$ 61,52</span>
                  <span className="text-xs text-zinc-400 line-through">R$ 548,52</span>
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">76%</span>
                </div>
                <span className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">Frete grátis</span>
              </div>
              <button onClick={() => setPickerOpen(false)} className="p-1 text-zinc-500"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-4">
              <div className="text-sm font-bold">
                Cor: <span className="font-normal text-zinc-600">{selectedColor ?? "Selecione"}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {colorVariants.map((c, i) => {
                  const active = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => { setSelectedColor(c.name); setCurrent(i); }}
                      className={`flex flex-col items-center rounded-xl border p-2 ${active ? "border-rose-500 ring-2 ring-rose-200" : "border-zinc-200"}`}
                    >
                      <img src={c.img} alt={c.name} className="aspect-square w-full rounded-md object-cover" />
                      <span className="mt-1.5 text-xs text-zinc-700">{c.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 text-sm font-bold">
                Tamanho: <span className="font-normal text-zinc-600">{selectedSize ?? "Selecione"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const active = selectedSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[52px] rounded-lg border px-4 py-2 text-sm font-semibold ${active ? "border-rose-500 bg-rose-50 text-rose-600" : "border-zinc-300 text-zinc-700"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-zinc-100 bg-white p-3">
              <button
                onClick={() => setPickerOpen(false)}
                className="w-full rounded-full bg-rose-500 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
                disabled={!selectedColor || !selectedSize}
              >
                Comprar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
