import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Copy, Check, ChevronDown, Smartphone, Camera, ClipboardCopy, Clipboard } from "lucide-react";

type Search = { total?: number; code?: string; hash?: string };

export const Route = createFileRoute("/pagamento")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    total: typeof s.total === "number" ? s.total : Number(s.total) || undefined,
    code: typeof s.code === "string" ? s.code : undefined,
    hash: typeof s.hash === "string" ? s.hash : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Código do pagamento" },
      { name: "description", content: "Pague com Pix copia e cola ou QR Code." },
    ],
  }),
  component: PaymentPage,
});

const FALLBACK_PIX = "";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useCountdown(initialSec: number) {
  const [s, setS] = useState(initialSec);
  useEffect(() => {
    const i = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function PaymentPage() {
  const { total } = Route.useSearch();
  const amount = total ?? 169.8;
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const time = useCountdown(30 * 60);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const deadline = (() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${hh}:${mm}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  })();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto flex max-w-[480px] flex-col items-center justify-center px-6 pt-40">
          <div className="relative h-10 w-10">
            <span className="absolute inset-0 rounded-full border-2 border-zinc-900" />
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-rose-500" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold">Gerando pagamento...</h1>
          <p className="mt-1 text-sm text-zinc-500">Por favor, aguarde um momento</p>
        </div>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(PIX_CODE)}`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <Link to="/checkout" className="absolute left-3 p-1">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-base font-bold">Código do pagamento</h1>
        </header>

        {/* Valor */}
        <div className="m-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="text-base font-bold">Aguardando o pagamento</div>
          <div className="mt-1 text-2xl font-extrabold">{brl(amount)}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
            <span>Vence em</span>
            <span className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{time}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-400">Prazo {deadline}</div>
        </div>

        {/* Pix copia e cola */}
        <div className="mx-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="text-sm font-bold">Pagamento via Pix</div>
          <div className="mt-3 break-all rounded-md bg-zinc-100 p-3 text-[11px] leading-relaxed text-zinc-700">
            {PIX_CODE}
          </div>
          <button
            onClick={onCopy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        {/* Instruções */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="text-sm font-bold">Como pagar com Pix (copia e cola)</div>
          <ul className="mt-3 space-y-3">
            <li className="flex items-start gap-3">
              <ClipboardCopy className="mt-0.5 h-5 w-5 text-zinc-700" />
              <div>
                <div className="text-sm font-bold">Copie o código</div>
                <div className="text-xs text-zinc-500">Use o botão copiar para levar o código Pix.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-zinc-700" />
              <div>
                <div className="text-sm font-bold">Abra o app do banco</div>
                <div className="text-xs text-zinc-500">Entre no aplicativo financeiro onde deseja pagar.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Clipboard className="mt-0.5 h-5 w-5 text-zinc-700" />
              <div>
                <div className="text-sm font-bold">Pix &gt; Copia e cola</div>
                <div className="text-xs text-zinc-500">Cole o código na opção Pix copia e cola.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 text-zinc-700" />
              <div>
                <div className="text-sm font-bold">Conclua o pagamento</div>
                <div className="text-xs text-zinc-500">Finalize e guarde o comprovante para acompanhamento.</div>
              </div>
            </li>
          </ul>
        </div>

        {/* QR Code */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <button
            onClick={() => setQrOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm font-bold"
          >
            Ou pague com QR Code
            <ChevronDown className={`h-4 w-4 transition ${qrOpen ? "rotate-180" : ""}`} />
          </button>

          {qrOpen && (
            <>
              <div className="mt-3 grid place-items-center rounded-md bg-zinc-100 p-6">
                <img src={qrUrl} alt="QR Code Pix" className="h-60 w-60" />
              </div>

              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 text-zinc-700" />
                  <div>
                    <div className="text-sm font-bold">Abra o app do banco</div>
                    <div className="text-xs text-zinc-500">Clique em Pagar com Pix</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Camera className="mt-0.5 h-5 w-5 text-zinc-700" />
                  <div>
                    <div className="text-sm font-bold">Aponte a câmera</div>
                    <div className="text-xs text-zinc-500">Aponte a câmera do celular para o QR Code acima.</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 text-zinc-700" />
                  <div>
                    <div className="text-sm font-bold">Conclua o pagamento</div>
                    <div className="text-xs text-zinc-500">Confirme os dados e finalize o pagamento.</div>
                  </div>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
