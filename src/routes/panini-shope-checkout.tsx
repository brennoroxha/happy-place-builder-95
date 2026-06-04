import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ShieldCheck, Truck, X, Gift, Check, QrCode, ArrowDown, ShoppingBag, Lock, RotateCcw, Headphones, Upload } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fileToDataUrl, updateOrder, upsertOrder, getOrder } from "@/lib/orders";
import { PaniniCartProvider, usePaniniCart } from "@/lib/panini-cart";
import { trackInitiateCheckout, trackPurchase } from "@/lib/track";
import { getTracking } from "@/lib/tracking";
import { createKlivoTransaction } from "@/lib/klivopay.functions";
import { createFreepayTransaction } from "@/lib/freepay.functions";
import { createIronpayTransaction } from "@/lib/ironpay.functions";
import { getActiveProvider } from "@/lib/admin.functions";
import { tiktokShopLogo, pixLogo, maoCelular } from "@/assets/external";

export const Route = createFileRoute("/panini-shope-checkout")({
  head: () => ({
    meta: [{ title: "Resumo do Pedido — Panini Shopee" }],
  }),
  component: () => (
    <PaniniCartProvider>
      <PaniniCheckoutPage />
    </PaniniCartProvider>
  ),
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// ---------- Validators ----------
const validateCPF = (raw: string) => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
};

const validateCNPJ = (raw: string) => {
  const c = onlyDigits(raw);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(c[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(c[12]) && calc(13) === parseInt(c[13]);
};

const validateDoc = (raw: string) => {
  const d = onlyDigits(raw);
  if (d.length === 11) return validateCPF(d);
  if (d.length === 14) return validateCNPJ(d);
  return false;
};

const validatePhone = (raw: string) => {
  const d = onlyDigits(raw);
  // 10 or 11 digits, DDD valid (11-99), if 11 digits 3rd must be 9
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = parseInt(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
};

const validateEmail = (raw: string) => /^\S+@\S+\.\S+$/.test(raw.trim());
const validateName = (raw: string) => raw.trim().split(/\s+/).length >= 2;

// ---------- Masks ----------
const maskPhone = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskDoc = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
};

type Step = 1 | 2 | 3 | 4;

function PaniniCheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, count, setQty, remove } = usePaniniCart();
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Entrega
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [complemento, setComplemento] = useState("");
  const shippingOptions = [
    { id: "jadlog", label: "JadLog", price: 25.5, eta: "Receba em até 2 dias úteis" },
    { id: "sedex", label: "Sedex-Express", price: 17.5, eta: "Receba em até 4 dias úteis" },
    { id: "correio", label: "Correio", price: 0, eta: "Receba em até 7 dias úteis" },
  ];
  const [shipping, setShipping] = useState("jadlog");
  const [pagamento, setPagamento] = useState("pix");
  const [processing, setProcessing] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [bumpAdded, setBumpAdded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const BUMP_PRICE = 39.9;
  const BUMP_ORIGINAL = 149;
  const bumpExtra = bumpAdded ? BUMP_PRICE : 0;
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofErr, setProofErr] = useState<string | null>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!paymentHash) return;
    const o = getOrder(paymentHash);
    if (o?.proofDataUrl) setProofUrl(o.proofDataUrl);
  }, [paymentHash]);

  const onPickProof = async (file: File) => {
    setProofErr(null);
    if (!paymentHash) {
      setProofErr("Pedido não identificado.");
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setProofErr("Envie uma imagem ou PDF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setProofErr("Arquivo grande demais (máx. 4MB).");
      return;
    }
    setProofUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploadedAt = new Date().toISOString();
      const updated = updateOrder(paymentHash, {
        proofDataUrl: dataUrl,
        proofUploadedAt: uploadedAt,
      });
      if (!updated) {
        upsertOrder({
          hash: paymentHash,
          status: "pending",
          createdAt: uploadedAt,
          proofDataUrl: dataUrl,
          proofUploadedAt: uploadedAt,
        } as never);
      }
      setProofUrl(dataUrl);
      try {
        const { uploadProof } = await import("@/lib/proof.functions");
        await uploadProof({ data: { hash: paymentHash, dataUrl } });
      } catch (err) {
        console.error("uploadProof failed", err);
        setProofErr("Comprovante salvo localmente, mas não foi enviado ao servidor.");
      }
    } catch {
      setProofErr("Não foi possível ler o arquivo.");
    } finally {
      setProofUploading(false);
    }
  };


  // Provider selection (managed in /admin → Panini tab)
  const klivo = useServerFn(createKlivoTransaction);
  const freepay = useServerFn(createFreepayTransaction);
  const ironpay = useServerFn(createIronpayTransaction);
  const fetchProvider = useServerFn(getActiveProvider);
  const [provider, setProvider] = useState<"klivopay" | "freepay" | "ironpay">("klivopay");
  useEffect(() => {
    fetchProvider({ data: { scope: "panini" } })
      .then((r) => setProvider(r.provider))
      .catch(() => {});
  }, [fetchProvider]);

  // Fire InitiateCheckout pixel once when the Panini checkout loads
  useEffect(() => {
    trackInitiateCheckout(subtotal || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selectedShipping = shippingOptions.find((s) => s.id === shipping)!;
  const [cepLoading, setCepLoading] = useState(false);
  const maskCep = (v: string) => {
    const d = onlyDigits(v).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const handleCepChange = async (v: string) => {
    const masked = maskCep(v);
    setCep(masked);
    const digits = onlyDigits(masked);
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const j = await r.json();
        if (!j.erro) {
          setEndereco(j.logradouro ?? "");
          setBairro(j.bairro ?? "");
          setCidade(j.localidade ?? "");
          setEstado(j.uf ?? "");
        }
      } catch {}
      setCepLoading(false);
    }
  };

  const step2Valid =
    onlyDigits(cep).length === 8 &&
    endereco.trim().length > 0 &&
    numero.trim().length > 0 &&
    bairro.trim().length > 0 &&
    cidade.trim().length > 0 &&
    estado.trim().length > 0;

  // Coupon countdown (5h)
  const [secondsLeft, setSecondsLeft] = useState(5 * 60 * 60);
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  // restore from previous session if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem("panini:identificacao");
      if (raw) {
        const a = JSON.parse(raw);
        setEmail(a.email ?? "");
        setTelefone(a.telefone ?? "");
        setNome(a.nome ?? "");
        setDoc(a.doc ?? "");
      }
    } catch {}
  }, []);

  const errors = useMemo(
    () => ({
      email: validateEmail(email) ? null : "E-mail inválido",
      telefone: validatePhone(telefone) ? null : "Telefone inválido",
      nome: validateName(nome) ? null : "Digite seu nome completo",
      doc: validateDoc(doc) ? null : "CPF ou CNPJ inválido",
    }),
    [email, telefone, nome, doc]
  );

  const step1Valid = !errors.email && !errors.telefone && !errors.nome && !errors.doc;

  const goEntrega = () => {
    if (!step1Valid) {
      setTouched({ email: true, telefone: true, nome: true, doc: true });
      return;
    }
    try {
      localStorage.setItem(
        "panini:identificacao",
        JSON.stringify({ email, telefone, nome, doc })
      );
    } catch {}
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // fallback: assume discount of ~77% to mirror screenshot if no original price
  const totalOriginal = items.reduce(
    (s, it) => s + it.qty * (it.price / 0.23),
    0
  );
  const discount = Math.max(0, totalOriginal - subtotal);

  const fieldErr = (k: keyof typeof errors) =>
    touched[k] && errors[k] ? (
      <p className="mt-1 text-xs text-[#ee4d2d]">{errors[k]}</p>
    ) : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Store logo banner */}
      <div className="flex items-center justify-between bg-white px-4 py-2">
        <img
          src={tiktokShopLogo}
          alt="TikTok Shop"
          className="h-7 object-contain"
        />
        <div className="flex items-center gap-1.5 text-zinc-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-[11px] font-semibold leading-tight">PAGAMENTO<br/>100% SEGURO</span>
        </div>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => history.back()}
            aria-label="Voltar"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-zinc-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold">{step === 4 ? "Realizar pagamento" : "Resumo do Pedido"}</h1>
            {step === 4 && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" /> Dados criptografados
              </div>
            )}
          </div>
          <div className="w-9" />
        </div>
        {/* Ticket strip */}
        <div className="relative h-2 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, #ef4444 0 14px, transparent 14px 18px, #38bdf8 18px 32px, transparent 32px 36px)",
            }}
          />
        </div>
      </header>

      <main className="px-4 pb-32 pt-4">
        {/* Stepper */}
        {step !== 4 ? (
          <div className="mb-5 flex items-start justify-between">
            {[
              { k: 1, label: "DADOS" },
              { k: 2, label: "ENDEREÇO" },
              { k: 3, label: "PAGAMENTO" },
            ].map((s, idx, arr) => {
              const active = step === s.k;
              const done = step > s.k;
              return (
                <div key={s.k} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center" style={{ width: 80 }}>
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-200 text-zinc-400"
                      }`}
                    >
                      {done ? (
                        <Check className="h-5 w-5" strokeWidth={3} />
                      ) : active && s.k === 3 ? (
                        <QrCode className="h-5 w-5" />
                      ) : (
                        s.k
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-center text-[11px] font-bold tracking-wide ${
                        active || done ? "text-zinc-700" : "text-zinc-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`mx-1 mt-5 h-0.5 flex-1 ${
                        step > s.k ? "bg-emerald-500" : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 1 && (
          <>
            {/* Free shipping banner */}
            <div className="-mx-4 mb-4 flex items-center gap-2 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-600">
              <Truck className="h-5 w-5" />
              Você ganhou frete grátis!
            </div>



            {/* Identificação form */}
            <section className="-mx-4 mb-4 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-100">
              <Field label="E-mail" error={fieldErr("email")}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                  className={inputCls(!!(touched.email && errors.email))}
                />
              </Field>

              <Field label="Telefone" error={fieldErr("telefone")}>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(99) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  onBlur={() => setTouched((s) => ({ ...s, telefone: true }))}
                  className={inputCls(!!(touched.telefone && errors.telefone))}
                />
              </Field>

              <Field label="Nome completo" error={fieldErr("nome")}>
                <input
                  autoComplete="name"
                  placeholder="Nome e Sobrenome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, nome: true }))}
                  className={inputCls(!!(touched.nome && errors.nome))}
                />
              </Field>

              <Field label="CPF/CNPJ" error={fieldErr("doc")}>
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={doc}
                  onChange={(e) => setDoc(maskDoc(e.target.value))}
                  onBlur={() => setTouched((s) => ({ ...s, doc: true }))}
                  className={inputCls(!!(touched.doc && errors.doc))}
                />
              </Field>

              <div className="mt-3 rounded-lg border border-dashed border-zinc-300 p-3 text-xs text-zinc-600">
                <div className="mb-1 font-bold text-zinc-800">Por que precisamos desses dados?</div>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Enviar o comprovante de compra;</li>
                  <li>Garantir a devolução caso necessário;</li>
                  <li>Acompanhar o andamento do pedido.</li>
                </ul>
              </div>

              <button
                onClick={goEntrega}
                disabled={!step1Valid}
                className="mt-4 w-full rounded-lg bg-zinc-900 py-3.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ir para entrega
              </button>
            </section>

            {/* Cart summary */}
            <section className="-mx-4 mb-4 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-2 text-sm font-bold">
                Resumo do carrinho ({count} {count === 1 ? "item" : "itens"})
              </div>
              {items.length === 0 ? (
                <div className="rounded-md bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                  Seu carrinho está vazio.
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.slug} className="flex gap-3 rounded-lg border border-zinc-100 p-2">
                      <img
                        src={it.img}
                        alt={it.name}
                        className="h-20 w-20 flex-shrink-0 rounded-md bg-zinc-50 object-contain"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                            {it.name}
                          </div>
                          <button
                            onClick={() => remove(it.slug)}
                            aria-label="Remover"
                            className="text-zinc-400 hover:text-[#ee4d2d]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#ee4d2d]">
                            - 77%
                          </span>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Frete grátis
                          </span>
                        </div>
                        <div className="mt-1 flex items-end justify-between">
                          <div>
                            <div className="text-base font-bold text-zinc-900">{brl(it.price)}</div>
                            <div className="text-[11px] text-zinc-400 line-through">
                              {brl(it.price / 0.23)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-md border border-zinc-200">
                            <button
                              onClick={() => setQty(it.slug, it.qty - 1)}
                              className="grid h-7 w-7 place-items-center text-zinc-600"
                              aria-label="Diminuir"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">
                              {it.qty}
                            </span>
                            <button
                              onClick={() => setQty(it.slug, it.qty + 1)}
                              className="grid h-7 w-7 place-items-center text-zinc-600"
                              aria-label="Aumentar"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-right text-xs font-semibold text-zinc-700">
                          Subtotal: {brl(it.price * it.qty)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Resumo do pedido */}
            <section className="-mx-4 mb-4 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-3 text-sm font-bold">Resumo do pedido</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-semibold text-zinc-900">{brl(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Desconto</span>
                  <span className="font-semibold text-emerald-600">- {brl(discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Frete</span>
                  <span className="font-semibold text-emerald-600">Grátis</span>
                </div>
                <div className="mt-2 border-t border-zinc-100 pt-2 flex justify-between">
                  <span className="font-bold text-zinc-900">Total</span>
                  <span className="text-lg font-extrabold text-zinc-900">{brl(subtotal)}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {step === 2 && (
          <>
            {/* Free shipping banner */}
            <div className="-mx-4 mb-4 flex items-center gap-2 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-600">
              <Truck className="h-5 w-5" />
              Você ganhou frete grátis!
            </div>

            {/* Entrega form */}
            <section className="-mx-4 mb-4 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-100">
              <Field label="CEP">
                <input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className={inputCls(false)}
                />
                {cepLoading && (
                  <div className="mt-1 text-xs text-zinc-500">Buscando endereço...</div>
                )}
              </Field>
              <Field label="Endereço">
                <input
                  placeholder="Rua / Avenida"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Número">
                <input
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Bairro">
                <input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Estado">
                <input
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Complemento">
                <input
                  placeholder="Apartamento, bloco, referência (opcional)"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className={inputCls(false)}
                />
              </Field>

              <div className="mt-4 mb-2 text-sm font-bold text-zinc-900">
                Opções de entrega disponíveis
              </div>
              <div className="space-y-2">
                {shippingOptions.map((opt) => {
                  const active = shipping === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                        active ? "border-zinc-900" : "border-zinc-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={active}
                        onChange={() => setShipping(opt.id)}
                        className="h-4 w-4 accent-zinc-900"
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-zinc-900">{opt.label}</div>
                          <div className="text-xs text-zinc-500">{opt.eta}</div>
                        </div>
                        <div className="text-sm font-bold text-zinc-900">{brl(opt.price)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-zinc-600">
                Frete selecionado: {selectedShipping.label} ({brl(selectedShipping.price)})
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="mt-4 w-full rounded-lg bg-zinc-900 py-3.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ir para pagamento
              </button>
            </section>

            {/* Cart summary */}
            <section className="-mx-4 mb-4 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-2 text-sm font-bold">
                Resumo do carrinho ({count} {count === 1 ? "item" : "itens"})
              </div>
              {items.length === 0 ? (
                <div className="rounded-md bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                  Seu carrinho está vazio.
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.slug} className="flex gap-3 rounded-lg border border-zinc-100 p-2">
                      <img
                        src={it.img}
                        alt={it.name}
                        className="h-20 w-20 flex-shrink-0 rounded-md bg-zinc-50 object-contain"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                            {it.name}
                          </div>
                          <button
                            onClick={() => remove(it.slug)}
                            aria-label="Remover"
                            className="text-zinc-400 hover:text-[#ee4d2d]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#ee4d2d]">
                            - 77%
                          </span>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Frete grátis
                          </span>
                        </div>
                        <div className="mt-1 flex items-end justify-between">
                          <div>
                            <div className="text-base font-bold text-zinc-900">{brl(it.price)}</div>
                            <div className="text-[11px] text-zinc-400 line-through">
                              {brl(it.price / 0.23)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-md border border-zinc-200">
                            <button
                              onClick={() => setQty(it.slug, it.qty - 1)}
                              className="grid h-7 w-7 place-items-center text-zinc-600"
                              aria-label="Diminuir"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">
                              {it.qty}
                            </span>
                            <button
                              onClick={() => setQty(it.slug, it.qty + 1)}
                              className="grid h-7 w-7 place-items-center text-zinc-600"
                              aria-label="Aumentar"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-right text-xs font-semibold text-zinc-700">
                          Subtotal: {brl(it.price * it.qty)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Resumo do pedido */}
            <section className="-mx-4 mb-4 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-3 text-sm font-bold">Resumo do pedido</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-semibold text-zinc-900">{brl(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Desconto</span>
                  <span className="font-semibold text-emerald-600">- {brl(discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Frete</span>
                  <span className="font-semibold text-zinc-900">
                    {selectedShipping.price === 0 ? (
                      <span className="text-emerald-600">Grátis</span>
                    ) : (
                      brl(selectedShipping.price)
                    )}
                  </span>
                </div>
                <div className="mt-2 border-t border-zinc-100 pt-2 flex justify-between">
                  <span className="font-bold text-zinc-900">Total</span>
                  <span className="text-lg font-extrabold text-zinc-900">
                    {brl(subtotal + selectedShipping.price)}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {step === 3 && (
          <>
            {/* Order Bump - Porta figurinhas */}
            <section className="-mx-4 mb-4 overflow-hidden bg-white shadow-sm ring-1 ring-zinc-100">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-center text-[13px] font-extrabold uppercase tracking-wide text-white">
                🔥 Oferta exclusiva
              </div>

              <div className="flex gap-2 overflow-x-auto px-3 pt-3 scrollbar-hide">
                {[
                  "https://http2.mlstatic.com/D_NQ_NP_2X_812865-MLA110125149288_042026-F.webp",
                  "https://http2.mlstatic.com/D_NQ_NP_2X_812450-MLA110125149278_042026-F.webp",
                  "https://http2.mlstatic.com/D_NQ_NP_2X_644580-MLA110011991746_042026-F.webp",
                ].map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Porta figurinhas Caixa Maleta Premium"
                    className="h-24 w-24 flex-shrink-0 cursor-pointer rounded-md object-cover ring-1 ring-zinc-200 transition active:scale-95"
                    onClick={() => setLightboxImage(src)}
                  />
                ))}
              </div>

              <div className="px-3 pt-3">
                <h3 className="text-[14px] font-extrabold leading-tight text-zinc-900">
                  Porta figurinhas Caixa Maleta Premium
                </h3>
                <p className="mt-1 text-[12px] leading-snug text-zinc-600">
                  Oficial Copa 2026 — guarde e proteja toda sua coleção em segurança 🏆
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-zinc-400 line-through">{brl(BUMP_ORIGINAL)}</span>
                  <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[13px] font-extrabold text-white">
                    por {brl(BUMP_PRICE)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">-73%</span>
                </div>
              </div>

              <label
                className={`mt-3 flex cursor-pointer items-center gap-3 border-t border-dashed border-zinc-200 px-3 py-3 transition ${
                  bumpAdded ? "bg-emerald-50/60" : "bg-amber-50/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={bumpAdded}
                  onChange={(e) => setBumpAdded(e.target.checked)}
                  className="h-5 w-5 flex-shrink-0 accent-emerald-500"
                />
                <span className="text-[13px] font-extrabold leading-tight text-zinc-900">
                  SIM! Adicionar ao meu pedido por {brl(BUMP_PRICE)}
                </span>
              </label>
            </section>

            {/* Pagamento card */}
            <section className="-mx-4 mb-4 bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-4 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-zinc-900" />
                <h2 className="text-lg font-extrabold text-zinc-900">Pagamento</h2>
              </div>

              {/* PIX selected option */}
              <div className="overflow-hidden rounded-xl border-2 border-emerald-500 bg-white">
                <div className="flex items-center gap-2 bg-emerald-50/60 px-4 py-3">
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-emerald-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-extrabold text-zinc-900">Pix</span>
                </div>
                <div className="flex flex-col items-center px-4 py-8">
                  <img
                    src={pixLogo}
                    alt="Pix"
                    className="h-14 w-auto"
                    onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <p className="mt-5 text-center text-sm font-bold text-zinc-900">
                    Para pagar, finalize sua compra abaixo
                  </p>
                  <ArrowDown className="mt-2 h-4 w-4 text-zinc-400" />
                </div>
              </div>

              {payError && (
                <p className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-xs font-semibold text-[#ee4d2d]">
                  {payError}
                </p>
              )}

              {/* Finalizar button */}
              <button
                disabled={processing}
                onClick={async () => {
                  setPayError(null);
                  setProcessing(true);
                  const total = subtotal + selectedShipping.price + bumpExtra;
                  const amountCents = Math.round(total * 100);
                  try {
                    const phone = onlyDigits(telefone);
                    const document = onlyDigits(doc);
                    const cart = [
                      ...items.map((i) => ({
                        title: i.name,
                        quantity: i.qty,
                        price: Math.round(i.price * 100),
                      })),
                      ...(selectedShipping.price > 0
                        ? [{ title: `Frete ${selectedShipping.label}`, quantity: 1, price: Math.round(selectedShipping.price * 100) }]
                        : []),
                      ...(bumpAdded
                        ? [{ title: "Porta figurinhas Caixa Maleta Premium", quantity: 1, price: Math.round(BUMP_PRICE * 100) }]
                        : []),
                    ];
                    const fn = provider === "freepay" ? freepay : provider === "ironpay" ? ironpay : klivo;
                    const res = await fn({
                      data: {
                        amount: amountCents,
                        customer: { name: nome.trim(), email, phone, document },
                        cart,
                        tracking: getTracking(),
                        scope: "panini",
                      },
                    });
                    if (!res.ok) {
                      setPayError(res.error);
                      return;
                    }
                    setPixCode(res.pix_copy_paste);
                    setPaymentHash(res.hash);
                    trackPurchase(total, res.hash);
                    setStep(4);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } catch {
                    setPayError("Erro de conexão. Tente novamente.");
                  } finally {
                    setProcessing(false);
                  }
                }}
                className="mt-5 w-full rounded-full bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[.99] disabled:cursor-wait disabled:opacity-80"
              >
                {processing ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    PROCESSANDO...
                  </span>
                ) : (
                  <>Finalizar pedido · {brl(subtotal + selectedShipping.price + bumpExtra)}</>
                )}
              </button>
            </section>

            {/* Resumo do pedido */}
            <section className="-mx-4 mb-4 bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-zinc-900" />
                <h3 className="text-base font-extrabold text-zinc-900">Resumo do pedido</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-semibold text-zinc-900">{brl(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Desconto</span>
                  <span className="font-semibold text-emerald-600">- {brl(discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Frete ({selectedShipping.label})</span>
                  <span className="font-bold text-zinc-900">
                    {selectedShipping.price === 0 ? (
                      <span className="text-emerald-600">Grátis</span>
                    ) : (
                      brl(selectedShipping.price)
                    )}
                  </span>
                </div>
                {bumpAdded && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Caixa Maleta Premium</span>
                    <span className="font-bold text-zinc-900">{brl(BUMP_PRICE)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-zinc-100 pt-4">
                <span className="text-base font-extrabold text-zinc-900">Total</span>
                <span className="text-xl font-extrabold text-zinc-900">
                  {brl(subtotal + selectedShipping.price + bumpExtra)}
                </span>
              </div>
            </section>

            {/* Garantia / confiança */}
            <section className="-mx-4 mb-4 bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100">
              <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-zinc-800">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Garantia de Devolução do Dinheiro em <strong>14 dias</strong></span>
              </div>
              <h4 className="mb-4 text-center text-sm font-extrabold text-zinc-900">Compre com confiança!</h4>
              <ul className="space-y-3 text-sm text-zinc-700">
                <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /><span>Garantia de Devolução de 100% do Dinheiro</span></li>
                <li className="flex items-center gap-3"><RotateCcw className="h-4 w-4 shrink-0 text-emerald-600" /><span>Devoluções Sem Complicações</span></li>
                <li className="flex items-center gap-3"><Lock className="h-4 w-4 shrink-0 text-emerald-600" /><span>Transações Seguras</span></li>
                <li className="flex items-center gap-3"><Headphones className="h-4 w-4 shrink-0 text-emerald-600" /><span>Atendimento ao Cliente 24/7</span></li>
              </ul>
            </section>
          </>
        )}

        {step === 4 && (
          <>
            <section className="-mx-4 mb-4 bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100">
              <div className="text-center text-lg font-extrabold text-zinc-900">Já é quase seu...</div>
              <p className="mt-1 text-center text-sm text-zinc-600">
                Pague seu Pix dentro de 30 minutos para garantir sua compra.
              </p>
              <div className="my-4 flex justify-center">
                <img
                  src={maoCelular}
                  alt="Aguardando pagamento"
                  className="h-40 w-auto object-contain"
                />
              </div>
              <div className="text-center text-base font-bold text-zinc-900">Aguardando pagamento...</div>
            </section>

            <section className="-mx-4 mb-4 bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100">
              <h2 className="text-base font-extrabold text-zinc-900">Pagamento via Pix</h2>
              <p className="mt-1 text-xs text-zinc-500">Use o QR Code ou copie o código Pix abaixo:</p>
              <div className="mt-3 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-700">
                {pixCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(pixCode).catch(() => {});
                  setPixCopied(true);
                  setTimeout(() => setPixCopied(false), 2000);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ee4d2d] py-3.5 text-sm font-extrabold text-white hover:bg-[#d8431f]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {pixCopied ? "Código copiado!" : "Copiar código Pix"}
              </button>
              <p className="mt-2 text-center text-xs font-semibold text-emerald-600">
                Copie o código Pix abaixo para pagar.
              </p>
            </section>

            <section className="-mx-4 mb-4 px-4">
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 text-center shadow-sm">
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

                {proofUrl ? (
                  <div className="mt-3">
                    <img
                      src={proofUrl}
                      alt="Comprovante enviado"
                      className="max-h-60 w-full rounded-md border border-rose-200 bg-white object-contain"
                    />
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                      <Check className="h-4 w-4" />
                      Comprovante recebido
                    </div>
                    <button
                      type="button"
                      onClick={() => proofFileRef.current?.click()}
                      className="mt-3 w-full rounded-xl border border-rose-200 bg-white py-2.5 text-sm font-bold text-rose-600"
                    >
                      Enviar outro comprovante
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => proofFileRef.current?.click()}
                    disabled={proofUploading || !paymentHash}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    {proofUploading ? "Enviando..." : "Anexar comprovante"}
                  </button>
                )}

                {proofErr && (
                  <div className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-center text-xs text-rose-600">
                    {proofErr}
                  </div>
                )}

                <input
                  ref={proofFileRef}
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
            </section>



            <section className="-mx-4 mb-4 px-4">
              <h2 className="mb-3 text-base font-extrabold text-zinc-900">
                Como pagar com Pix (copia e cola)
              </h2>
              <div className="space-y-3">
                {[
                  { t: "Copie o código", d: "Use o botão copiar para levar o código Pix." },
                  { t: "Abra o app do banco", d: "Entre no aplicativo financeiro onde deseja pagar." },
                  { t: "Pix > Copia e cola", d: "Cole o código na opção Pix copia e cola." },
                  { t: "Confira os dados", d: "Verifique recebedor e valor antes de confirmar." },
                  { t: "Conclua o pagamento", d: "Finalize e guarde o comprovante para acompanhamento." },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-100">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-900">{s.t}</div>
                      <div className="text-xs text-zinc-500">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Ampliado"
              className="w-full rounded-xl object-contain"
              onClick={() => setLightboxImage(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-bold text-zinc-800">{label}</label>
      {children}
      {error}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-3 text-sm outline-none transition-colors ${
    hasError
      ? "border-orange-300 focus:border-[#ee4d2d]"
      : "border-zinc-300 focus:border-zinc-900"
  }`;
}
