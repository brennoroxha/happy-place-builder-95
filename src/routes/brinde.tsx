import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, AlertTriangle, Check, ShieldCheck } from "lucide-react";
import brindeImg from "@/assets/crioterapico.png";
import { createKlivoTransaction } from "@/lib/klivopay.functions";
import { createFreepayTransaction } from "@/lib/freepay.functions";
import { getActiveProvider } from "@/lib/admin.functions";
import { upsertOrder } from "@/lib/orders";
import { getTracking } from "@/lib/tracking";
import { usePageTracking } from "@/hooks/use-page-tracking";

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

const FEE = 13.97;

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Address = {
  nome: string; sobrenome: string; telefone: string; email: string; cpf: string;
  rua: string; numero: string; complemento?: string;
  bairro: string; cidade: string; estado: string; cep: string;
};

function BrindePage() {
  usePageTracking("presence:brinde", "/brinde");
  const { hash } = Route.useSearch();
  const navigate = useNavigate();
  const klivo = useServerFn(createKlivoTransaction);
  const freepay = useServerFn(createFreepayTransaction);
  const fetchProvider = useServerFn(getActiveProvider);

  const [address, setAddress] = useState<Address | null>(null);
  const [provider, setProvider] = useState<"klivopay" | "freepay">("klivopay");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("slimbelly:address");
      if (raw) setAddress(JSON.parse(raw));
    } catch {}
    fetchProvider({ data: {} }).then((r) => setProvider(r.provider)).catch(() => {});
  }, [fetchProvider]);

  const payFee = async () => {
    setPayError(null);
    if (!address) {
      setPayError("Endereço não encontrado. Refaça o pedido.");
      return;
    }
    setPaying(true);
    try {
      const phone = address.telefone.replace(/\D/g, "").replace(/^55/, "");
      const document = address.cpf.replace(/\D/g, "");
      const fn = provider === "freepay" ? freepay : klivo;
      const res = await fn({
        data: {
          amount: Math.round(FEE * 100),
          customer: {
            name: `${address.nome} ${address.sobrenome}`.trim(),
            email: address.email,
            phone,
            document,
          },
          cart: [
            {
              title: "Correção de frete + Brinde Crioterápico",
              quantity: 1,
              price: Math.round(FEE * 100),
            },
          ],
          tracking: getTracking(),
        },
      });
      if (!res.ok) {
        setPayError(res.error);
        return;
      }
      upsertOrder({
        hash: res.hash,
        provider,
        total: FEE,
        code: res.pix_copy_paste,
        createdAt: new Date().toISOString(),
        status: "pending",
        customer: {
          name: `${address.nome} ${address.sobrenome}`.trim(),
          email: address.email,
          phone,
          document,
        },
      });
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
      <div className="mx-auto max-w-[480px] pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <h1 className="text-base font-bold">Correção de frete</h1>
        </header>

        {/* Aviso crítico */}
        <div className="m-3 rounded-lg bg-rose-600 p-4 text-white shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wide">
                Atenção
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                O <strong>não pagamento</strong> da diferença de frete{" "}
                <strong>implicará no não envio do produto</strong>. Regularize
                para garantir a entrega do seu pedido.
              </p>
            </div>
          </div>
        </div>

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
                Existe uma diferença de <strong>{brl(FEE)}</strong> que precisa ser
                paga para liberar o envio para a sua região.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                Como forma de compensar esse erro, vamos enviar{" "}
                <strong>gratuitamente um brinde exclusivo</strong> junto com o seu
                pedido. 💝
              </p>
            </div>
          </div>
        </div>

        {/* CTA acima do brinde */}
        <div className="mx-3 mt-3">
          <button
            disabled={paying}
            onClick={payFee}
            className="block w-full rounded-lg bg-rose-500 py-3 text-center text-white shadow disabled:opacity-70"
          >
            <div className="text-base font-bold leading-tight">
              {paying ? "Gerando pagamento..." : `Pagar taxa de ${brl(FEE)}`}
            </div>
            <div className="text-[11px] leading-tight opacity-90">
              Pix • liberação imediata
            </div>
          </button>
        </div>

        {/* Brinde */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-rose-500" />
            <div className="text-sm font-bold">Seu brinde exclusivo</div>
          </div>

          <div className="mt-3 grid place-items-center rounded-md bg-gradient-to-b from-rose-50 to-white p-3">
            <img
              src={brindeImg}
              alt="Crioterápico Gel Redutor de Celulite"
              className="h-14 w-auto object-contain drop-shadow-md"
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
              <span>Pague a diferença de {brl(FEE)} via Pix para liberar o envio.</span>
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
          {payError && (
            <div className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {payError}
            </div>
          )}
          <button
            disabled={paying}
            onClick={payFee}
            className="block w-full rounded-lg bg-rose-500 py-3 text-center text-white shadow disabled:opacity-70"
          >
            <div className="text-base font-bold leading-tight">
              {paying ? "Gerando pagamento..." : `Pagar taxa de ${brl(FEE)}`}
            </div>
            <div className="text-[11px] leading-tight opacity-90">
              Pix • liberação imediata
            </div>
          </button>
          <p className="mt-3 text-center text-[11px] text-zinc-400">
            Pedido original {hash ? `#${hash.slice(0, 8)}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
