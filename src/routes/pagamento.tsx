import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type ComponentType } from "react";
import {
  Copy,
  Check,
  Upload,
  ShieldCheck,
  Lock,
  User,
  MapPin,
  QrCode,
  RotateCcw,
  Headphones,
  Star,
  Clock,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import {
  fileToDataUrl,
  getOrder,
  updateOrder,
  type Order,
} from "@/lib/orders";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackPurchase } from "@/lib/track";
import slimBellyBege from "@/assets/slim-belly-bege.png";
import slimBellyPreta from "@/assets/slim-belly-preta.png";
import slimBellyVermelha from "@/assets/slim-belly-vermelha.png";

type Search = {
  total?: number;
  code?: string;
  hash?: string;
  color?: string;
  size?: string;
  shipping?: string;
};

export const Route = createFileRoute("/pagamento")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    total: typeof s.total === "number" ? s.total : Number(s.total) || undefined,
    code: typeof s.code === "string" ? s.code : undefined,
    hash: typeof s.hash === "string" ? s.hash : undefined,
    color: typeof s.color === "string" ? s.color : undefined,
    size: typeof s.size === "string" ? s.size : undefined,
    shipping: typeof s.shipping === "string" ? s.shipping : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pagamento via Pix — Slim Belly" },
      { name: "description", content: "Pague com Pix copia e cola ou QR Code." },
    ],
  }),
  component: PaymentPage,
});

const UNIT_PRICE = 59.9;
const colorImages: Record<string, string> = {
  Bege: slimBellyBege,
  Preta: slimBellyPreta,
  Vermelha: slimBellyVermelha,
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STEPS = [
  { key: 1, label: "Dados Pessoais", short: "Dados Pessoais", Icon: User },
  { key: 2, label: "Entrega", short: "Entrega", Icon: MapPin },
  { key: 3, label: "Pagamento", short: "Pagamento", Icon: QrCode },
] as const;

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
  const { total, code, hash, color, size, shipping } = Route.useSearch();
  const amount = total ?? UNIT_PRICE;
  const pixCode = code || "";
  const productImage = (color && colorImages[color]) || slimBellyBege;
  const shippingLabel = shipping === "sedex" ? "Sedex Express" : "Transportadora";

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const time = useCountdown(15 * 60);
  const [order, setOrder] = useState<Order | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hash) setOrder(getOrder(hash));
  }, [hash]);

  const firedPurchase = useRef(false);
  useEffect(() => {
    if (!hash) return;
    let cancelled = false;
    const check = async () => {
      try {
        const { getSaleStatus } = await import("@/lib/admin.functions");
        const { status } = await getSaleStatus({ data: { hash } });
        if (cancelled) return;
        if (status === "paid" || status === "confirmed" || status === "approved") {
          if (!firedPurchase.current) {
            firedPurchase.current = true;
            trackPurchase(amount, hash);
          }
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

  useEffect(() => {
    if (order?.status === "confirmed" && hash) {
      if (!firedPurchase.current) {
        firedPurchase.current = true;
        trackPurchase(amount, hash);
      }
      navigate({ to: "/brinde", search: { total: amount, hash } });
    }
  }, [order?.status, hash, amount, navigate]);

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
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setUploadErr("Envie uma imagem ou PDF.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-[480px] flex-col items-center justify-center px-6 pt-40">
          <div className="relative h-10 w-10">
            <span className="absolute inset-0 rounded-full border-2 border-slate-200" />
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold">Gerando pagamento...</h1>
          <p className="mt-1 text-sm text-slate-500">Por favor, aguarde um momento</p>
        </div>
      </div>
    );
  }

  const qrUrl = pixCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(pixCode)}`
    : "";
  const orderNumber = hash ? hash.slice(0, 10) : "—";
  const customerEmail = order?.customer?.email ?? "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-[640px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="https://sf16-website.neutral.ttwstatic.com/obj/tiktok_web_static/i18n_ecom_fe/tiktok_shop_web_mono/packages/apps/pdp_h5/static/image/tts-logo-light.28ce4ad8.png"
              alt="TikTok Shop"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-1.5 text-right">
            <Lock className="h-4 w-4 text-slate-700" />
            <div className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-700">
              Pagamento<br />100% Seguro
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-4 py-5">
        {/* Stepper — all 3 completed */}
        <div className="mb-4 flex items-start justify-between">
          {STEPS.map((s, idx) => (
            <Fragment key={s.key}>
              <div className="flex flex-col items-center" style={{ width: 100 }}>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white">
                  <s.Icon className="h-5 w-5" />
                </div>
                <span className="mt-1 text-center text-[11px] font-bold text-slate-900">
                  {s.short}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="mx-2 mt-5 h-0.5 flex-1 bg-emerald-500" />
              )}
            </Fragment>
          ))}
        </div>

        {/* PIX card */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="rounded-xl border border-slate-200 p-5">
            <h2 className="text-center text-lg font-bold text-slate-900">
              Falta pouco! Seu pedido está quase concluído.
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Pague com PIX no app do seu banco seguindo as orientações a seguir
            </p>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm">
              <Clock className="h-5 w-5 text-slate-700" />
              <span className="font-semibold text-slate-900">Tempo restante para pagar:</span>
              <span className="font-extrabold text-rose-600">{time}</span>
            </div>

            {/* QR Code */}
            <div className="mt-5 flex justify-center">
              <div className="rounded-md border-4 border-slate-200 bg-white p-2">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR Code Pix" className="h-64 w-64" />
                ) : (
                  <div className="grid h-64 w-64 place-items-center text-xs text-slate-400">
                    QR indisponível
                  </div>
                )}
              </div>
            </div>

            {/* Pix code */}
            <div className="mt-5">
              <div className="truncate rounded-md border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
                {pixCode || "—"}
              </div>
              <button
                onClick={onCopy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-blue-700 active:scale-[.99]"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copied ? "CÓDIGO COPIADO" : "COPIAR CÓDIGO"}
              </button>
            </div>

            {/* Instructions */}
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>Copie o código PIX;</li>
              <li>Acesse o APP do seu banco;</li>
              <li>Escolha pagar com PIX;</li>
              <li>Cole o código do PIX;</li>
              <li>Confirme o pagamento.</li>
            </ul>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700">
              <HelpCircle className="h-4 w-4 text-rose-600" />
              <a href="#help" className="hover:underline">Preciso de ajuda para pagar com PIX</a>
            </div>

            <div className="my-5 border-t border-slate-200" />

            <p className="text-center text-sm text-slate-700">
              Assim que o seu pagamento for confirmado pela instituição financeira nós te avisaremos pelo seu email:
              {customerEmail && (
                <>
                  <br />
                  <span className="font-bold text-blue-700">{customerEmail}</span>
                </>
              )}
            </p>

            <div className="mt-5 flex items-center justify-between rounded-md bg-slate-100 px-4 py-3 text-sm">
              <span className="text-slate-600">Número do pedido:</span>
              <span className="font-extrabold text-slate-900">{orderNumber}</span>
            </div>

            {/* Comprovante */}
            <div className="mt-5 rounded-md border-2 border-dashed border-rose-400 p-4">
              <div className="flex flex-col items-center">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-rose-500 text-white">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900">Já pagou? Envie o comprovante</div>
                <p className="mt-1 text-center text-xs text-slate-500">
                  Se o sistema demorar para confirmar, anexe aqui o print/PDF do Pix para agilizar a liberação do seu pedido.
                </p>
              </div>

              {order?.proofDataUrl ? (
                <div className="mt-3">
                  <img
                    src={order.proofDataUrl}
                    alt="Comprovante enviado"
                    className="max-h-60 w-full rounded-md border border-slate-200 object-contain bg-slate-50"
                  />
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-600">
                    <Check className="h-4 w-4" />
                    Comprovante recebido
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 w-full rounded-md border border-slate-200 py-2 text-sm font-bold"
                  >
                    Enviar outro comprovante
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || !hash}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-rose-500 py-3 text-sm font-extrabold uppercase text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Enviando..." : "↑ Anexar comprovante"}
                </button>
              )}

              {uploadErr && (
                <div className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-center text-xs text-rose-600">
                  {uploadErr}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickProof(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </section>

        {/* Resumo do pedido */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-slate-900" />
            <h3 className="text-base font-extrabold text-slate-900">Resumo do pedido</h3>
          </div>
          <div className="border-t border-slate-100 pt-3 flex items-center gap-3">
            <img src={productImage} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900 leading-snug">
                1 Cinta — Cinta Modeladora Slim Belly (1 Cinta)
              </div>
              <div className="mt-0.5 text-xs text-slate-500">Qtd: 1</div>
              {color && <div className="text-xs text-slate-500">Cor: {color}</div>}
              {size && <div className="text-xs text-slate-500">Tamanho: {size}</div>}
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900">{brl(UNIT_PRICE)}</div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span>🏷</span> Subtotal
              </span>
              <span className="font-semibold text-slate-900">{brl(UNIT_PRICE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Frete ({shippingLabel})</span>
              <span className="font-bold text-emerald-600">{shipping === "sedex" ? "R$ 6,32" : "Grátis"}</span>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-xl font-extrabold text-slate-900">{brl(amount)}</span>
          </div>
        </section>

        {/* Garantia / confiança */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            <span>Garantia de Devolução do Dinheiro em <strong>14 dias</strong></span>
          </div>
          <h4 className="mb-3 text-sm font-extrabold text-slate-900">Compre com confiança!</h4>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <TrustItem Icon={ShieldCheck} text="Garantia de Devolução de 100% do Dinheiro" />
            <TrustItem Icon={RotateCcw} text="Devoluções Sem Complicações" />
            <TrustItem Icon={Lock} text="Transações Seguras" />
            <TrustItem Icon={Headphones} text="Atendimento ao Cliente 24/7" />
          </ul>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">5000+ Avaliações de Clientes</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1 text-sm font-extrabold text-slate-900">5/5</span>
              </div>
            </div>
            <p className="text-sm italic text-slate-600">
              "Fiquei encantada com o atendimento! A entrega foi rápida e o processo de compra, super fácil. Recomendo a todos!"
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">— Isabela Marcondes</p>
          </div>
        </section>

        <p className="mt-5 pb-8 text-center text-[11px] text-slate-400">
          Confia Shop LTDA · CNPJ 64.119.790/0001-01
        </p>
      </main>
    </div>
  );
}

function TrustItem({ Icon, text }: { Icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>{text}</span>
    </li>
  );
}
