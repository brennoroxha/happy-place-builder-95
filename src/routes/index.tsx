import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, ShoppingCart, MessageCircle, Truck, ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import logo from "@/assets/shopee/logo.webp";
import img1 from "@/assets/shopee/1.webp";
import img2 from "@/assets/shopee/2.webp";
import img3 from "@/assets/shopee/3.webp";
import img4 from "@/assets/shopee/4.webp";
import img5 from "@/assets/shopee/5.webp";
import avatar from "@/assets/shopee/avatar.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Closet Dobrável Inteligente – Cupons Premiados" },
      { name: "description", content: "Closet Dobrável Inteligente com 50% OFF. Promoção DAY WEEK por tempo limitado." },
      { property: "og:title", content: "Closet Dobrável Inteligente – 50% OFF" },
      { property: "og:description", content: "Aproveite a promoção DAY WEEK e leve o seu Closet Dobrável Inteligente com desconto." },
    ],
  }),
  component: Index,
});

const PRODUCT_IMAGES = [img1, img2, img3, img4, img5];

const REVIEWS = [
  { name: "Jose Freitas", date: "14-04-26 11:36", text: "Produto veio muito bem embalado, usei pra encher um pneu de caminhonete e foi muito rápido, me surpreendeu, agora é testar o auxiliar de partida" },
  { name: "Fabiano Silva", date: "14-04-26 10:52", text: "Produto parece ser de boa qualidade, chegou rápido e todas as peças conforme o anúncio, recomendo a loja e o produto..." },
  { name: "Kellen Alonso", date: "13-04-26 14:42", text: "Eu tbm comprei o meu, e chegou no prazo certinho que eles falaram que ia chegar. Comprei dia 03/04 e chegou dia 13/04. O equipamento é massa mesmo. Podem confiar. Eu mesma instalei 🙏" },
  { name: "Gabriela Pinho", date: "13-04-26 11:04", text: "Comprei para meu pai, ele disse que veio tudo certo e bem embalado. Não demorou para chegar e nem pra enviar, recomendo a loja ✨" },
  { name: "Amanda Pereira", date: "10-04-26 19:31", text: "Mercadoria chegou em tempo excelente, funcionado bem. Chegou de acordo com o anúncio." },
  { name: "Lucas Caldas", date: "09-04-26 23:57", text: "Recomendo! Produto de qualidade, entrega rápida e atendimento excelente." },
];

function useCountdown(initialSeconds: number) {
  const [s, setS] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return { h, m, sec };
}

function Index() {
  const [active, setActive] = useState(0);
  const { h, m, sec } = useCountdown(3 * 3600 + 47 * 60 + 12);

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-neutral-800">
      {/* Top promo bar */}
      <header className="flex items-center justify-between gap-3 bg-gradient-to-b from-[#f53f2d] to-[#fe6332] px-3 py-2.5 text-white">
        <a href="#" className="w-1/2 max-w-[160px]">
          <img src={logo} alt="Shopee" className="w-full md:w-[150px]" />
        </a>
        <div className="flex w-full max-w-[80%] flex-col items-center border border-white p-1 md:hidden">
          <span className="text-[10px] tracking-wide">1500 CUPONS DISPONÍVEIS</span>
          <div className="flex w-full items-center justify-between">
            <h3 className="m-0 animate-[shake_1s_infinite] text-base font-bold text-[#00dddc]">DAY WEEK</h3>
            <h5 className="m-0 text-[10px]">
              <span className="mx-1 font-bold">|</span> 50% OFF
            </h5>
          </div>
        </div>
        <style>{`@keyframes shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}`}</style>
      </header>

      <main className="mx-auto max-w-5xl bg-white">
        {/* Gallery + buy box */}
        <section className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div>
            <div className="relative overflow-hidden rounded bg-neutral-50">
              <img src={PRODUCT_IMAGES[active]} alt="Produto" className="aspect-square w-full object-contain" />
              <button
                onClick={() => setActive((a) => (a - 1 + PRODUCT_IMAGES.length) % PRODUCT_IMAGES.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
                aria-label="Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setActive((a) => (a + 1) % PRODUCT_IMAGES.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
                aria-label="Próximo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {PRODUCT_IMAGES.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                    i === active ? "border-[#ee4d2d]" : "border-transparent"
                  }`}
                >
                  <img src={src} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
              <button className="flex items-center gap-1 hover:text-[#ee4d2d]">
                <Share2 size={16} /> Compartilhar
              </button>
              <button className="flex items-center gap-1 hover:text-[#ee4d2d]">
                <Heart size={16} /> Favoritar
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-lg font-medium leading-snug md:text-xl">
              Closet Dobrável Inteligente — Organizador Multifuncional com 6 Prateleiras
            </h1>

            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 border-r pr-3">
                <span className="border-b border-[#ee4d2d] text-[#ee4d2d]">4.9</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-[#ee4d2d] text-[#ee4d2d]" />
                  ))}
                </div>
              </div>
              <div className="border-r pr-3">
                <span className="border-b text-neutral-700">2.4mil</span>{" "}
                <span className="text-neutral-500">Avaliações</span>
              </div>
              <div>
                <span className="text-neutral-700">1.871</span>{" "}
                <span className="text-neutral-500">Vendidos</span>
              </div>
            </div>

            <div className="mt-4 rounded bg-[#fafafa] p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-neutral-400 line-through">R$ 299,90</span>
                <span className="text-3xl font-medium text-[#ee4d2d]">R$ 149,90</span>
                <span className="rounded bg-[#ee4d2d] px-1.5 py-0.5 text-xs font-semibold text-white">
                  -50%
                </span>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                ou 12x de <span className="font-semibold text-neutral-700">R$ 8,97</span> sem juros
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded border border-[#ee4d2d]/30 bg-[#fff7f5] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#ee4d2d]">
                Termina em:
              </span>
              <div className="flex gap-1 text-sm font-bold">
                <span className="rounded bg-neutral-900 px-2 py-1 text-white">{h}</span>
                <span>:</span>
                <span className="rounded bg-neutral-900 px-2 py-1 text-white">{m}</span>
                <span>:</span>
                <span className="rounded bg-neutral-900 px-2 py-1 text-white">{sec}</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <Truck size={16} className="text-[#ee4d2d]" /> Frete grátis para todo o Brasil
              </li>
              <li className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-[#ee4d2d]" /> Garantia de 7 dias
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#ee4d2d]" /> Atendimento via chat 24h
              </li>
            </ul>

            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded border border-[#ee4d2d] bg-[#fff5f1] py-3 text-sm font-semibold text-[#ee4d2d] hover:bg-[#ffe7df]">
                Adicionar ao Carrinho
              </button>
              <button className="flex-1 rounded bg-[#ee4d2d] py-3 text-sm font-semibold text-white shadow hover:bg-[#d73e21]">
                Comprar agora
              </button>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="border-t p-4 md:p-6">
          <h2 className="mb-3 bg-[#fafafa] p-3 text-base font-medium uppercase tracking-wide text-neutral-700">
            Descrição do Produto
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-neutral-700">
            <p>
              O <strong>Closet Dobrável Inteligente</strong> é a solução perfeita para quem busca
              organização sem abrir mão do estilo. Com 6 prateleiras espaçosas e estrutura
              reforçada, mantém suas roupas e acessórios sempre acessíveis.
            </p>
            <p>
              Montagem rápida em minutos, sem ferramentas. Capa removível e lavável que protege
              contra poeira e umidade. Ideal para quartos, corredores ou closets pequenos.
            </p>
            <ul className="list-inside list-disc space-y-1 pl-2">
              <li>Estrutura em aço com revestimento anticorrosivo</li>
              <li>Capa em tecido não-tecido respirável</li>
              <li>Capacidade: até 80kg distribuídos</li>
              <li>Dimensões: 150 x 45 x 175 cm</li>
            </ul>
          </div>
        </section>

        {/* Reviews */}
        <section className="border-t p-4 md:p-6">
          <h2 className="mb-4 bg-[#fafafa] p-3 text-base font-medium uppercase tracking-wide text-neutral-700">
            Avaliações dos Clientes
          </h2>

          <div className="mb-4 flex flex-wrap items-center gap-4 rounded border border-[#ee4d2d]/30 bg-[#fff7f5] p-4">
            <div className="text-center">
              <div className="text-3xl font-semibold text-[#ee4d2d]">4.9</div>
              <div className="flex justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-[#ee4d2d] text-[#ee4d2d]" />
                ))}
              </div>
              <div className="text-xs text-neutral-500">de 5</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Tudo", "5 ★ (2.1mil)", "4 ★ (240)", "3 ★ (30)", "Com Fotos", "Com Comentário"].map(
                (t, i) => (
                  <button
                    key={t}
                    className={`rounded border px-3 py-1 ${
                      i === 0
                        ? "border-[#ee4d2d] bg-white text-[#ee4d2d]"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-[#ee4d2d] hover:text-[#ee4d2d]"
                    }`}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </div>

          <ul className="divide-y">
            {REVIEWS.map((r) => (
              <li key={r.name} className="flex gap-3 py-4">
                <img src={avatar} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-800">{r.name}</div>
                  <div className="my-1 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className="fill-[#ee4d2d] text-[#ee4d2d]" />
                    ))}
                  </div>
                  <p className="text-sm text-neutral-700">{r.text}</p>
                  <div className="mt-1 text-xs text-neutral-400">{r.date}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-center gap-1 text-sm text-neutral-500">
            {["<", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "…", ">"].map((p, i) => (
              <button
                key={i}
                className={`min-w-[28px] rounded border px-2 py-1 ${
                  p === "1"
                    ? "border-[#ee4d2d] bg-[#ee4d2d] text-white"
                    : "border-neutral-200 bg-white hover:border-[#ee4d2d] hover:text-[#ee4d2d]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t bg-white">
        <div className="mx-auto grid max-w-5xl gap-6 p-6 text-sm text-neutral-600 md:grid-cols-4">
          <div>
            <h4 className="mb-2 font-semibold uppercase tracking-wide text-neutral-700">
              Sobre Nós
            </h4>
            <ul className="space-y-1">
              <li>Quem somos</li>
              <li>Imprensa</li>
              <li>Blog</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold uppercase tracking-wide text-neutral-700">
              Políticas
            </h4>
            <ul className="space-y-1">
              <li>Política de Privacidade</li>
              <li>Termos de Uso</li>
              <li>Ofertas Relâmpago</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold uppercase tracking-wide text-neutral-700">
              Atendimento
            </h4>
            <ul className="space-y-1">
              <li>Central de Ajuda</li>
              <li>Programa de Afiliados</li>
              <li>Seja um Entregador</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold uppercase tracking-wide text-neutral-700">
              Pagamento
            </h4>
            <div className="flex flex-wrap gap-2">
              {["Visa", "Master", "Elo", "Pix", "Boleto"].map((m) => (
                <span
                  key={m}
                  className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-neutral-400">
          © 2025 Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
