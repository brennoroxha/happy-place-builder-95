import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  Gift,
  ShieldCheck,
  Clock,
  Upload,
} from "lucide-react";
import { createKlivoTransactionConta2 } from "@/lib/klivopay.functions";
import { getTracking } from "@/lib/tracking";
import { portaFigurinhasCopa } from "@/assets/external";
import { paniniUtmifyHeadScripts } from "@/lib/utmify-head";
import { usePageTracking } from "@/hooks/use-page-tracking";

type Search = { hash?: string };

export const Route = createFileRoute("/upsell/taxa-envio")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    hash: typeof s.hash === "string" ? s.hash : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ajuste de envio • Panini Copa" },
      {
        name: "description",
        content: "Conclua o ajuste do frete para liberar o envio do seu álbum.",
      },
    ],
    scripts: paniniUtmifyHeadScripts,
  }),
  component: UpsellTaxaEnvio,
});

const FEE = 17.97;
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Address = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
};

function UpsellTaxaEnvio() {
  usePageTracking("presence:upsell-taxa-envio", "/upsell/taxa-envio");
  const { hash } = Route.useSearch();
  const navigate = useNavigate();
  const klivo = useServerFn(createKlivoTransactionConta2);
  const [address, setAddress] = useState<Address | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("panini:address");
      if (raw) setAddress(JSON.parse(raw));
    } catch {}
  }, []);

  const payFee = async () => {
    setPayError(null);
    if (!address) {
      setPayError(
        "Não encontramos seus dados. Volte ao checkout e refaça o pedido.",
      );
      return;
    }
    setPaying(true);
    try {
      const phone = address.telefone.replace(/\D/g, "").replace(/^55/, "");
      const document = address.cpf.replace(/\D/g, "");
      const res = await klivo({
        data: {
          amount: Math.round(FEE * 100),
          customer: {
            name: address.nome.trim(),
            email: address.email,
            phone,
            document,
          },
          cart: [
            {
              title: "Ajuste de frete + Porta Figurinhas Copa 2026",
              quantity: 1,
              price: Math.round(FEE * 100),
            },
          ],
          tracking: getTracking(),
          scope: "panini",
        },
      });
      if (!res.ok) {
        setPayError(res.error);
        return;
      }
      navigate({
        to: "/pagamento",
        search: { total: FEE, code: res.pix_copy_paste, hash: res.hash },
      });
    } catch {
      setPayError("Erro de conexão. Tente novamente.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-12">
        {/* Top confirmation badge */}
        <div className="px-4 pt-5">
          <div className="mx-auto inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Pagamento confirmado
          </div>
        </div>

        {/* Alert */}
        <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-base font-extrabold text-orange-600">
                Ops! Detectamos um erro no cálculo do envio
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                Identificamos uma falha no nosso sistema ao calcular o valor do
                frete para seu CEP. Sentimos muito pelo transtorno — para
                finalizar o despacho do seu pedido, precisamos de um pequeno
                ajuste de{" "}
                <strong className="text-rose-600">{brl(FEE)}</strong> referente
                à taxa correta dos Correios.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-4 mt-4">
          <button
            disabled={paying}
            onClick={payFee}
            className="block w-full rounded-xl bg-emerald-500 py-4 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-600 active:scale-[.99] disabled:opacity-70"
          >
            {paying ? "Gerando pagamento..." : "Realizar pagamento da taxa"}
          </button>
        </div>

        {/* Brinde card */}
        <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-rose-500" />
            <div className="text-sm font-extrabold text-zinc-900">
              Como pedido de desculpas, um brinde exclusivo
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Vamos enviar junto ao seu pedido{" "}
            <strong className="text-zinc-900">
              1 Porta Figurinhas Álbum Copa do Mundo 2026
            </strong>
            , totalmente grátis, em agradecimento pela compreensão.
          </p>

          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
              Grátis
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg">
            <img
              src={portaFigurinhasCopa}
              alt="Porta Figurinhas Álbum Copa do Mundo 2026"
              className="block w-full object-cover"
            />
          </div>
        </div>

        {/* Order summary */}
        <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-zinc-900">
            <ShieldCheck className="h-4 w-4 text-zinc-700" /> Ajuste de envio
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Taxa correta dos Correios</span>
              <span className="font-bold text-zinc-900">{brl(FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">
                1x Porta Figurinhas Álbum Copa 2026 (brinde)
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">
                Grátis
              </span>
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-100 pt-3 text-base">
              <span className="font-extrabold text-zinc-900">Total a pagar</span>
              <span className="font-extrabold text-zinc-900">{brl(FEE)}</span>
            </div>
          </div>
        </div>

        {/* CTA repeat */}
        <div className="mx-4 mt-4">
          {payError && (
            <div className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {payError}
            </div>
          )}
          <button
            disabled={paying}
            onClick={payFee}
            className="block w-full rounded-xl bg-emerald-500 py-4 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-600 active:scale-[.99] disabled:opacity-70"
          >
            {paying ? "Gerando pagamento..." : "Realizar pagamento da taxa"}
          </button>
        </div>

        {/* Trust badges */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
          {[
            { Icon: ShieldCheck, label: "Pagamento seguro", color: "text-emerald-600" },
            { Icon: Clock, label: "Liberação imediata", color: "text-emerald-600" },
            { Icon: Gift, label: "Brinde garantido", color: "text-rose-500" },
          ].map(({ Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-zinc-100"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="text-[11px] font-semibold text-zinc-700">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Comprovante card */}
        <div className="mx-4 mt-4 rounded-xl border-2 border-rose-200 bg-rose-50/40 p-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm">
            <Upload className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-3 text-sm font-extrabold text-zinc-900">
            Já pagou? Envie o comprovante
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Se o sistema demorar para confirmar, anexe aqui o print/PDF do Pix
            para agilizar a liberação do seu pedido.
          </p>
          <button
            type="button"
            onClick={() =>
              setPayError(
                "Após gerar o Pix você poderá anexar o comprovante na tela de pagamento.",
              )
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-rose-600"
          >
            <Upload className="h-4 w-4" /> Anexar comprovante
          </button>
        </div>

        <p className="mx-4 mt-4 text-center text-[11px] font-semibold text-rose-600">
          Atenção: o não pagamento da taxa implicará no não envio do produto.
        </p>

        {hash && (
          <p className="mt-2 text-center text-[10px] text-zinc-400">
            Pedido #{hash.slice(0, 8)}
          </p>
        )}
      </div>
    </div>
  );
}
