import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createKlivoTransaction } from "@/lib/klivopay.functions";
import { createFreepayTransaction } from "@/lib/freepay.functions";
import { getActiveProvider } from "@/lib/admin.functions";
import { upsertOrder } from "@/lib/orders";
import { getTracking } from "@/lib/tracking";
import {
  Lock,
  User,
  MapPin,
  QrCode,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Star,
  ChevronRight,
  Check,
  ShoppingBag,
  Pencil,
} from "lucide-react";
import slimBellyBege from "@/assets/slim-belly-bege.png";
import slimBellyPreta from "@/assets/slim-belly-preta.png";
import slimBellyVermelha from "@/assets/slim-belly-vermelha.png";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackInitiateCheckout } from "@/lib/track";

type CheckoutSearch = { color?: string; size?: string };

const colorImages: Record<string, string> = {
  Bege: slimBellyBege,
  Preta: slimBellyPreta,
  Vermelha: slimBellyVermelha,
};

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    color: typeof search.color === "string" ? search.color : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — Slim Belly" },
      { name: "description", content: "Finalize sua compra da Cinta Modeladora Slim Belly com segurança." },
    ],
  }),
  component: CheckoutPage,
});

const UNIT_PRICE = 59.9;
const ORIGINAL_PRICE = 179.9;
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (s: string) => s.replace(/\D/g, "");

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
const validatePhone = (raw: string) => {
  const d = onlyDigits(raw);
  return d.length === 10 || d.length === 11;
};
const validateCEP = (raw: string) => onlyDigits(raw).length === 8;

const maskPhone = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskCEP = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};
const maskCPF = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

type Values = {
  nome: string; email: string; cpf: string; telefone: string;
  cep: string; estado: string; cidade: string; bairro: string; rua: string; numero: string; complemento: string;
};

const empty: Values = {
  nome: "", email: "", cpf: "", telefone: "",
  cep: "", estado: "", cidade: "", bairro: "", rua: "", numero: "", complemento: "",
};

const STEPS = [
  { key: 1, label: "Dados Pessoais", short: "Dados", Icon: User },
  { key: 2, label: "Endereço", short: "Endereço", Icon: MapPin },
  { key: 3, label: "Pagamento", short: "Pagamento", Icon: QrCode },
] as const;

function CheckoutPage() {
  usePageTracking("presence:checkout", "/checkout");
  const { color, size } = Route.useSearch();
  const productImage = (color && colorImages[color]) || slimBellyBege;
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [v, setV] = useState<Values>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [cepLoading, setCepLoading] = useState(false);

  const klivo = useServerFn(createKlivoTransaction);
  const freepay = useServerFn(createFreepayTransaction);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"klivopay" | "freepay">("klivopay");
  const fetchProvider = useServerFn(getActiveProvider);

  // Restore from localStorage (returning users)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("slimbelly:address");
      if (raw) {
        const a = JSON.parse(raw);
        setV((s) => ({
          ...s,
          nome: `${a.nome ?? ""} ${a.sobrenome ?? ""}`.trim() || s.nome,
          email: a.email ?? s.email,
          cpf: a.cpf ?? s.cpf,
          telefone: a.telefone?.replace(/^\+55\s?/, "") ?? s.telefone,
          cep: a.cep ?? s.cep,
          estado: a.estado ?? s.estado,
          cidade: a.cidade ?? s.cidade,
          bairro: a.bairro ?? s.bairro,
          rua: a.rua ?? s.rua,
          numero: a.numero ?? s.numero,
          complemento: a.complemento ?? s.complemento,
        }));
      }
    } catch {}
    fetchProvider().then((r) => setProvider(r.provider)).catch(() => {});
  }, [fetchProvider]);

  // Fire begin_checkout / InitiateCheckout once
  const firedInitiate = useRef(false);
  useEffect(() => {
    if (firedInitiate.current) return;
    firedInitiate.current = true;
    trackInitiateCheckout(UNIT_PRICE);
  }, []);

  // ViaCEP auto-fill
  useEffect(() => {
    const d = onlyDigits(v.cep);
    if (d.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${d}/json/`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || j.erro) return;
        setV((s) => ({
          ...s,
          estado: j.uf || s.estado,
          cidade: j.localidade || s.cidade,
          bairro: j.bairro || s.bairro,
          rua: j.logradouro || s.rua,
        }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setCepLoading(false));
    return () => { cancelled = true; };
  }, [v.cep]);

  const set = <K extends keyof Values>(k: K, val: Values[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const errors = useMemo(() => ({
    nome: v.nome.trim().split(/\s+/).length >= 2 ? null : "Digite seu nome completo",
    email: /^\S+@\S+\.\S+$/.test(v.email) ? null : "E-mail inválido",
    cpf: validateCPF(v.cpf) ? null : "CPF inválido",
    telefone: validatePhone(v.telefone) ? null : "Telefone inválido",
    cep: validateCEP(v.cep) ? null : "CEP inválido",
    estado: v.estado ? null : "UF obrigatório",
    cidade: v.cidade.trim() ? null : "Cidade obrigatória",
    bairro: v.bairro.trim() ? null : "Bairro obrigatório",
    rua: v.rua.trim() ? null : "Rua obrigatória",
    numero: v.numero.trim() ? null : "Número obrigatório",
  }), [v]);

  const step1Valid = !errors.nome && !errors.email && !errors.cpf && !errors.telefone;
  const step2Valid = !errors.cep && !errors.estado && !errors.cidade && !errors.bairro && !errors.rua && !errors.numero;

  const advance = () => {
    if (step === 1) {
      if (!step1Valid) {
        setTouched((s) => ({ ...s, nome: true, email: true, cpf: true, telefone: true }));
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === 2) {
      if (!step2Valid) {
        setTouched((s) => ({ ...s, cep: true, estado: true, cidade: true, bairro: true, rua: true, numero: true }));
        return;
      }
      // Persist for /pagamento + address page compatibility
      try {
        const [first, ...rest] = v.nome.trim().split(/\s+/);
        localStorage.setItem("slimbelly:address", JSON.stringify({
          nome: first ?? "",
          sobrenome: rest.join(" "),
          telefone: `+55 ${v.telefone}`,
          email: v.email,
          cpf: v.cpf,
          cep: v.cep,
          estado: v.estado,
          cidade: v.cidade,
          bairro: v.bairro,
          rua: v.rua,
          numero: v.numero,
          complemento: v.complemento,
        }));
      } catch {}
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const finalize = async () => {
    setPayError(null);
    setPaying(true);
    try {
      const phone = v.telefone.replace(/\D/g, "");
      const document = v.cpf.replace(/\D/g, "");
      const fn = provider === "freepay" ? freepay : klivo;
      const total = UNIT_PRICE;
      const res = await fn({
        data: {
          amount: Math.round(total * 100),
          customer: {
            name: v.nome.trim(),
            email: v.email,
            phone,
            document,
          },
          cart: [
            {
              title: `Cinta Slim Belly${color ? ` - ${color}` : ""}${size ? ` ${size}` : ""}`,
              quantity: 1,
              price: Math.round(UNIT_PRICE * 100),
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
        total,
        code: res.pix_copy_paste,
        createdAt: new Date().toISOString(),
        status: "pending",
        customer: { name: v.nome.trim(), email: v.email, phone, document },
      });
      navigate({
        to: "/pagamento",
        search: { total, code: res.pix_copy_paste, hash: res.hash },
      });
    } catch {
      setPayError("Erro de conexão. Tente novamente.");
    } finally {
      setPaying(false);
    }
  };

  const fieldErr = (k: keyof typeof errors) =>
    touched[k] && errors[k] ? <p className="mt-1 text-xs text-rose-500">{errors[k]}</p> : null;

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
        {/* Stepper */}
        <div className="mb-4 flex items-start justify-between">
          {STEPS.map((s, idx) => {
            const active = step === s.key;
            const done = step > s.key;
            return (
              <Fragment key={s.key}>
                <div className="flex flex-col items-center" style={{ width: 72 }}>
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                      done
                        ? "bg-emerald-600 text-white"
                        : active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="h-5 w-5" /> : <s.Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`mt-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                      active || done ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {s.short}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 mt-5 h-0.5 flex-1 ${
                      step > s.key ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Dados pessoais resumo (passos 2 e 3) */}
        {(step === 2 || step === 3) && (
          <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
            <PersonalSummary
              email={v.email}
              nome={v.nome}
              telefone={v.telefone}
              onEdit={() => setStep(1)}
            />
          </section>
        )}

        {/* Step card */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          {step === 1 && (
            <>
              <div className="mb-1 flex items-center gap-2">
                <User className="h-5 w-5 text-slate-900" />
                <h2 className="text-lg font-extrabold text-slate-900">Dados Pessoais</h2>
              </div>
              <p className="mb-5 text-sm text-slate-500">
                Solicitamos apenas as informações essenciais para a realização da compra.
              </p>

              <Field label="E-mail" error={fieldErr("email")}>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="seu@email.com"
                  value={v.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                  className={inputCls(!!(touched.email && errors.email))}
                />
              </Field>

              <Field label="Nome completo" error={fieldErr("nome")}>
                <input
                  placeholder="Nome e sobrenome"
                  value={v.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, nome: true }))}
                  className={inputCls(!!(touched.nome && errors.nome))}
                />
              </Field>

              <Field label="CPF" error={fieldErr("cpf")}>
                <input
                  inputMode="numeric"
                  placeholder="999.999.999-99"
                  value={v.cpf}
                  onChange={(e) => set("cpf", maskCPF(e.target.value))}
                  onBlur={() => setTouched((s) => ({ ...s, cpf: true }))}
                  className={inputCls(!!(touched.cpf && errors.cpf))}
                />
              </Field>

              <Field label="Telefone" error={fieldErr("telefone")}>
                <input
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={v.telefone}
                  onChange={(e) => set("telefone", maskPhone(e.target.value))}
                  onBlur={() => setTouched((s) => ({ ...s, telefone: true }))}
                  className={inputCls(!!(touched.telefone && errors.telefone))}
                />
              </Field>

              <CtaButton onClick={advance}>
                Avançar para o endereço <ChevronRight className="h-5 w-5" />
              </CtaButton>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-1 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-900" />
                <h2 className="text-lg font-extrabold text-slate-900">Endereço de Entrega</h2>
              </div>
              <p className="mb-5 text-sm text-slate-500">
                Preencha o endereço para envio do seu pedido.
              </p>


              <Field label="CEP" error={fieldErr("cep")} hint={cepLoading ? "Buscando endereço..." : undefined}>
                <input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={v.cep}
                  onChange={(e) => set("cep", maskCEP(e.target.value))}
                  onBlur={() => setTouched((s) => ({ ...s, cep: true }))}
                  className={inputCls(!!(touched.cep && errors.cep))}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="UF" error={fieldErr("estado")}>
                  <select
                    value={v.estado}
                    onChange={(e) => set("estado", e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, estado: true }))}
                    className={inputCls(!!(touched.estado && errors.estado))}
                  >
                    <option value="">UF</option>
                    {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Cidade" error={fieldErr("cidade")}>
                    <input
                      placeholder="Cidade"
                      value={v.cidade}
                      onChange={(e) => set("cidade", e.target.value)}
                      onBlur={() => setTouched((s) => ({ ...s, cidade: true }))}
                      className={inputCls(!!(touched.cidade && errors.cidade))}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Bairro" error={fieldErr("bairro")}>
                <input
                  placeholder="Bairro"
                  value={v.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, bairro: true }))}
                  className={inputCls(!!(touched.bairro && errors.bairro))}
                />
              </Field>

              <Field label="Rua" error={fieldErr("rua")}>
                <input
                  placeholder="Rua"
                  value={v.rua}
                  onChange={(e) => set("rua", e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, rua: true }))}
                  className={inputCls(!!(touched.rua && errors.rua))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Número" error={fieldErr("numero")}>
                  <input
                    inputMode="numeric"
                    placeholder="123"
                    value={v.numero}
                    onChange={(e) => set("numero", e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, numero: true }))}
                    className={inputCls(!!(touched.numero && errors.numero))}
                  />
                </Field>
                <Field label="Complemento (opcional)">
                  <input
                    placeholder="Apto, bloco..."
                    value={v.complemento}
                    onChange={(e) => set("complemento", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={advance}
                  className="flex-[2] rounded-full bg-emerald-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-[.99]"
                >
                  Avançar para o pagamento
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <PersonalSummary
                email={v.email}
                nome={v.nome}
                telefone={v.telefone}
                onEdit={() => setStep(1)}
              />

              <div className="mb-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-slate-900" />
                <h2 className="text-lg font-extrabold text-slate-900">Pagamento</h2>
              </div>

              <div className="mb-4 overflow-hidden rounded-xl border-2 border-emerald-500">
                <div className="flex items-center gap-3 bg-emerald-50/60 px-4 py-3">
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-emerald-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">Pix</span>
                </div>
                <div className="flex flex-col items-center bg-white px-4 py-6">
                  <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none">
                    <path d="M24 6l6 6-6 6-6-6 6-6z" fill="#10b981"/>
                    <path d="M24 30l6 6-6 6-6-6 6-6z" fill="#10b981"/>
                    <path d="M6 24l6-6 6 6-6 6-6-6z" fill="#10b981"/>
                    <path d="M30 24l6-6 6 6-6 6-6-6z" fill="#10b981"/>
                  </svg>
                  <p className="mt-4 text-center text-sm font-bold text-slate-900">
                    Para pagar, finalize sua compra abaixo
                  </p>
                  <span className="mt-2 text-slate-400">↓</span>
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                <div className="font-semibold text-slate-700">Endereço de entrega</div>
                <div className="mt-0.5">
                  {v.rua}, {v.numero}{v.complemento ? `, ${v.complemento}` : ""} — {v.bairro}, {v.cidade}/{v.estado}, {v.cep}
                </div>
              </div>

              {payError && (
                <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{payError}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-full border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={finalize}
                  className="flex-[2] rounded-full bg-emerald-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-[.99] disabled:opacity-70"
                >
                  {paying ? "Gerando Pix..." : `Finalizar pedido · ${brl(UNIT_PRICE)}`}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Resumo do pedido */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-slate-900" />
            <h3 className="text-base font-extrabold text-slate-900">Resumo do pedido</h3>
          </div>
          <div className="flex items-center gap-3">
            <img src={productImage} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900 leading-snug">
                Cinta Modeladora Slim Belly
              </div>
              {(color || size) && (
                <div className="text-xs text-slate-500">
                  {[color, size].filter(Boolean).join(", ")}
                </div>
              )}
              <div className="mt-0.5 text-xs text-slate-500">Qtd: 1</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900">{brl(UNIT_PRICE)}</div>
              <div className="text-xs text-slate-400 line-through">{brl(ORIGINAL_PRICE)}</div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-900">{brl(UNIT_PRICE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Frete (Transportadora)</span>
              <span className="font-bold text-emerald-600">Grátis</span>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
            <span className="text-base font-extrabold text-slate-900">Total</span>
            <span className="text-xl font-extrabold text-slate-900">{brl(UNIT_PRICE)}</span>
          </div>
        </section>

        {/* Garantia / confiança */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            <span>Garantia de Devolução do Dinheiro em <strong>14 dias</strong></span>
          </div>
          <h4 className="mb-3 text-center text-sm font-extrabold text-slate-900">Compre com confiança!</h4>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <TrustItem Icon={ShieldCheck} text="Garantia de Devolução de 100% do Dinheiro" />
            <TrustItem Icon={RotateCcw} text="Devoluções Sem Complicações" />
            <TrustItem Icon={Lock} text="Transações Seguras" />
            <TrustItem Icon={Headphones} text="Atendimento ao Cliente 24/7" />
          </ul>
        </section>

        {/* Avaliações */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">5000+ Avaliações de Clientes</span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-extrabold text-slate-900">5/5</span>
            </div>
          </div>
          <p className="text-sm italic text-slate-600">
            "Fiquei encantada com o atendimento! A entrega foi rápida e o processo de compra, super fácil. Recomendo a todos!"
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">— Isabela Marcondes</p>
        </section>

        <p className="mt-5 pb-8 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Slim Belly · Pagamentos processados com segurança
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-bold text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${
    hasError ? "border-rose-400" : "border-slate-200"
  }`;
}

function CtaButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex w-full items-center justify-center gap-1 rounded-full bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-600 active:scale-[.99]"
    >
      {children}
    </button>
  );
}

function TrustItem({ Icon, text }: { Icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50">
        <Icon className="h-4 w-4 text-emerald-600" />
      </span>
      <span>{text}</span>
    </li>
  );
}

function PersonalSummary({
  email,
  nome,
  telefone,
  onEdit,
}: {
  email: string;
  nome: string;
  telefone: string;
  onEdit: () => void;
}) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-slate-900" />
          <h3 className="text-base font-extrabold text-slate-900">Dados pessoais</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold text-slate-700 hover:text-slate-900"
        >
          Não é você? Sair
        </button>
      </div>
      <div className="space-y-0.5 text-sm">
        <div className="text-slate-500">{email}</div>
        <div className="text-slate-700"><span className="font-bold text-slate-900">Nome:</span> {nome}</div>
        <div className="text-slate-700"><span className="font-bold text-slate-900">Telefone:</span> {telefone}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" />
        Alterar meus dados
      </button>
    </div>
  );
}
