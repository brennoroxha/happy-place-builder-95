import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Copy,
  Check,
  ChevronDown,
  Smartphone,
  Camera,
  ClipboardCopy,
  Clipboard,
  Upload,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import {
  fileToDataUrl,
  getOrder,
  updateOrder,
  type Order,
} from "@/lib/orders";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackPurchase } from "@/lib/track";

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
  usePageTracking("presence:pagamento", "/pagamento");
  const { total, code, hash } = Route.useSearch();
  const amount = total ?? 169.8;
  const pixCode = code || FALLBACK_PIX;
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const time = useCountdown(30 * 60);
  const [order, setOrder] = useState<Order | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hash) setOrder(getOrder(hash));
  }, [hash]);

  // Poll backend for payment confirmation
  useEffect(() => {
    if (!hash) return;
    let cancelled = false;
    const check = async () => {
      try {
        const { getSaleStatus } = await import("@/lib/admin.functions");
        const { status } = await getSaleStatus({ data: { hash } });
        if (cancelled) return;
        if (status === "paid" || status === "confirmed" || status === "approved") {
          navigate({ to: "/brinde", search: { total: amount, hash } });
        }
      } catch {}
    };
    check();
    const i = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [hash, amount, navigate]);

  // Redirect when local order becomes confirmed (e.g. via manual admin action)
  useEffect(() => {
    if (order?.status === "confirmed" && hash) {
      navigate({ to: "/brinde", search: { total: amount, hash } });
    }
  }, [order?.status, hash, amount, navigate]);

  const deadline = (() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${hh}:${mm}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  })();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const onPickProof = async (file: File) => {
    setUploadErr(null);
    if (!hash) {
      setUploadErr("Pedido não identificado.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadErr("Envie uma imagem (JPG ou PNG).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadErr("Arquivo grande demais (máx. 4MB).");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const updated = updateOrder(hash, {
        proofDataUrl: dataUrl,
        proofUploadedAt: new Date().toISOString(),
      });
      if (updated) setOrder(updated);
    } catch {
      setUploadErr("Não foi possível ler o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const confirmPayment = () => {
    if (!hash) return;
    const updated = updateOrder(hash, { status: "confirmed" });
    if (updated) setOrder(updated);
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(pixCode)}`;
  const confirmed = order?.status === "confirmed";

  const ProofSection = (
    <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-rose-500" />
        <div className="text-sm font-bold">Comprovante de pagamento</div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Já pagou? Envie a imagem do comprovante para agilizar a confirmação.
      </p>

      {order?.proofDataUrl ? (
        <div className="mt-3">
          <img
            src={order.proofDataUrl}
            alt="Comprovante enviado"
            className="max-h-72 w-full rounded-md border border-zinc-200 object-contain bg-zinc-50"
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
            <Check className="h-4 w-4" />
            Comprovante recebido
            {order.proofUploadedAt
              ? ` em ${new Date(order.proofUploadedAt).toLocaleString("pt-BR")}`
              : ""}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full rounded-lg border border-zinc-200 py-2 text-sm font-bold"
          >
            Enviar outro comprovante
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !hash}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-6 text-sm font-bold text-zinc-700 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Selecionar imagem do comprovante"}
        </button>
      )}

      {uploadErr && (
        <div className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-600">
          {uploadErr}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickProof(f);
          e.target.value = "";
        }}
      />

    </div>
  );

  if (confirmed) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-[480px] pb-10">
          <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
            <Link to="/" className="absolute left-3 p-1">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-base font-bold">Pagamento confirmado</h1>
          </header>

          <div className="m-3 rounded-lg bg-white p-5 shadow-sm text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="mt-3 text-base font-extrabold">Pagamento confirmado</div>
            <div className="mt-1 text-2xl font-extrabold">{brl(amount)}</div>
            <div className="mt-1 text-xs text-zinc-500">
              Seu pedido já está em processamento.
            </div>
          </div>

          {ProofSection}
        </div>
      </div>
    );
  }

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
            {pixCode}
          </div>
          <button
            onClick={onCopy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        {ProofSection}

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
