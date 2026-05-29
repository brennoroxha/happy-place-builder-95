import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ShieldCheck, Truck, X, Gift } from "lucide-react";
import { PaniniCartProvider, usePaniniCart } from "@/lib/panini-cart";

export const Route = createFileRoute("/panini-checkout")({
  head: () => ({
    meta: [{ title: "Resumo do Pedido — Panini Copa" }],
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

type Step = 1 | 2 | 3;

function PaniniCheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, count, setQty, remove } = usePaniniCart();
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
      <p className="mt-1 text-xs text-rose-500">{errors[k]}</p>
    ) : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
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
            <h1 className="text-base font-bold">Resumo do Pedido</h1>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Pagamento 100% seguro
            </div>
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

      <main className="mx-auto max-w-[640px] px-4 pb-32 pt-4">
        {/* Stepper */}
        <div className="mb-5 flex items-start justify-between">
          {[
            { k: 1, label: "Identificação" },
            { k: 2, label: "Entrega" },
            { k: 3, label: "Pagamento" },
          ].map((s, idx, arr) => {
            const active = step === s.k;
            const done = step > s.k;
            return (
              <div key={s.k} className="flex flex-1 items-start">
                <div className="flex flex-col items-center" style={{ width: 80 }}>
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : active
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    {s.k}
                  </div>
                  <span
                    className={`mt-1 text-[11px] font-semibold ${
                      active || done ? "text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`mx-1 mt-4 h-0.5 flex-1 ${
                      step > s.k ? "bg-emerald-600" : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <>
            {/* Loja header */}
            <div className="mb-3 text-sm font-semibold text-zinc-700">
              Loja ({count} {count === 1 ? "item" : "itens"})
            </div>

            {/* Free shipping banner */}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-700">
              <Truck className="h-5 w-5" />
              Você ganhou frete grátis!
            </div>

            {/* Cart summary */}
            <section className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-100">
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
                            className="text-zinc-400 hover:text-rose-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
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


            {/* Identificação form */}
            <section className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
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
            </section>

            {/* Resumo do pedido */}
            <section className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
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
              <button
                onClick={goEntrega}
                disabled={!step1Valid}
                className="mt-4 w-full rounded-lg bg-zinc-900 py-3.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ir para entrega
              </button>
            </section>
          </>
        )}

        {step === 2 && (
          <>
            {/* Cart summary */}
            <section className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-100">
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
                            className="text-zinc-400 hover:text-rose-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
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
            <section className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
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

            <section className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-100">
              <h2 className="mb-2 text-lg font-bold">Entrega</h2>
              <p className="text-sm text-zinc-500">Próxima etapa em breve.</p>
              <button
                onClick={() => setStep(1)}
                className="mt-4 text-sm font-semibold text-zinc-700 underline"
              >
                Voltar
              </button>
            </section>
          </>
        )}
      </main>

      {/* Bottom totals bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-[640px] px-4 py-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600">
            <Gift className="h-4 w-4" />
            <span>
              Você está economizando <strong>{brl(discount)}</strong> neste pedido.
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm text-zinc-600">
              Total ({count} {count === 1 ? "item" : "itens"})
            </span>
            <span className="text-lg font-extrabold text-zinc-900">{brl(subtotal)}</span>
          </div>
        </div>
      </div>
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
      ? "border-rose-400 focus:border-rose-500"
      : "border-zinc-300 focus:border-zinc-900"
  }`;
}
