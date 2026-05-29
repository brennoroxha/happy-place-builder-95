import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, AlertTriangle, Check, ShieldCheck } from "lucide-react";
import brindeImg from "@/assets/crioterapico.png";

type Search = { total?: number; hash?: string };

export const Route = createFileRoute("/brinde")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    total: typeof s.total === "number" ? s.total : Number(s.total) || undefined,
    hash: typeof s.hash === "string" ? s.hash : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Correção de frete - Brinde exclusivo" },
      { name: "description", content: "Pedimos desculpas pela diferença no frete." },
    ],
  }),
  component: BrindePage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BrindePage() {
  const { hash } = Route.useSearch();
  const diff = 13.97;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <h1 className="text-base font-bold">Correção de frete</h1>
        </header>

        {/* Confirmação */}
        <div className="m-3 rounded-lg bg-white p-5 shadow-sm text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="mt-3 text-base font-extrabold">Pagamento confirmado!</div>
          <div className="mt-1 text-xs text-zinc-500">Seu pedido já está em processamento.</div>
        </div>

        {/* Aviso */}
        <div className="mx-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-amber-900">
                Pedimos sinceras desculpas
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Identificamos uma divergência no cálculo do frete do seu pedido.
                O valor cobrado ficou <strong>{brl(diff)}</strong> abaixo do valor
                real para a sua região.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                Como forma de compensar esse erro e agradecer pela sua compreensão,
                vamos enviar <strong>gratuitamente um brinde exclusivo</strong> junto
                com o seu pedido. 💝
              </p>
            </div>
          </div>
        </div>

        {/* Brinde */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-rose-500" />
            <div className="text-sm font-bold">Seu brinde exclusivo</div>
          </div>

          <div className="mt-3 grid place-items-center rounded-md bg-gradient-to-b from-rose-50 to-white p-4">
            <img
              src={brindeImg}
              alt="Crioterápico Gel Redutor de Celulite"
              className="h-56 w-auto object-contain drop-shadow-md"
            />
          </div>

          <div className="mt-3 text-center">
            <div className="text-base font-extrabold">
              Crioterápico Gel Redutor de Celulite
            </div>
            <div className="text-xs text-zinc-500">Ação Drenante • 130g</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <Check className="h-3 w-3" />
              Incluso GRÁTIS no seu pedido
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-xs text-zinc-600">
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              Reduz a aparência da celulite
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              Ação drenante e refrescante
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              Fórmula com tecnologia crioterápica
            </li>
          </ul>
        </div>

        {/* Detalhes */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="text-sm font-bold">O que acontece agora?</div>
          <ol className="mt-3 space-y-3 text-xs text-zinc-600">
            <li className="flex gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">1</span>
              <span>Seu pedido será separado e enviado em até 2 dias úteis.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">2</span>
              <span>O brinde será incluso automaticamente, sem custo adicional.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">3</span>
              <span>Você receberá o código de rastreio por e-mail e WhatsApp.</span>
            </li>
          </ol>
        </div>

        <div className="mx-3 mt-4">
          <Link
            to="/"
            className="flex w-full items-center justify-center rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow"
          >
            Voltar à loja
          </Link>
          <p className="mt-3 text-center text-[11px] text-zinc-400">
            Pedido {hash ? `#${hash.slice(0, 8)}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
