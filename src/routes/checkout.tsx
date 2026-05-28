import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createKlivoTransaction } from "@/lib/klivopay.functions";
import { createFreepayTransaction } from "@/lib/freepay.functions";
import { upsertOrder } from "@/lib/orders";
import { ChevronLeft, ChevronRight, MapPin, Plus, Truck, Ticket, Shield, RefreshCw, Lock, Smile } from "lucide-react";
import slimBellyBege from "@/assets/slim-belly-bege.png";
import slimBellyPreta from "@/assets/slim-belly-preta.png";
import slimBellyVermelha from "@/assets/slim-belly-vermelha.png";

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
      { title: "Resumo do Pedido — Checkout" },
      { name: "description", content: "Finalize sua compra da Cinta Modeladora Slim Belly." },
    ],
  }),
  component: CheckoutPage,
});

const UNIT_PRICE = 59.9;
const ORIGINAL_PRICE = 179.9;
const SHIPPING_OPTIONS = [
  { id: "free", name: "Frete Grátis", eta: "Entrega de 7 a 5 dias úteis", price: 0 },
  { id: "express", name: "Frete Expresso", eta: "Entrega de 3 a 5 dias úteis", price: 5.98 },
  { id: "sedex", name: "SEDEX", eta: "Entrega em até 2 dias úteis", price: 9.8 },
];

function useCountdown(initial: number) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const i = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CheckoutPage() {
  const { color, size } = Route.useSearch();
  const productImage = (color && colorImages[color]) || slimBellyBege;
  const [qty, setQty] = useState(2);
  const [shipping, setShipping] = useState("free");
  const [payment] = useState("pix");
  const time = useCountdown(14 * 60 + 38);
  const [address, setAddress] = useState<null | {
    nome: string; sobrenome: string; telefone: string; email: string; cpf: string;
    rua: string; numero: string; complemento?: string;
    bairro: string; cidade: string; estado: string; cep: string;
  }>(null);
  const navigate = useNavigate();
  const klivo = useServerFn(createKlivoTransaction);
  const freepay = useServerFn(createFreepayTransaction);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"klivopay" | "freepay">("klivopay");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("slimbelly:address");
      if (raw) setAddress(JSON.parse(raw));
      const p = localStorage.getItem("slimbelly:provider");
      if (p === "klivopay" || p === "freepay") setProvider(p);
    } catch {}
  }, []);

  const subtotal = ORIGINAL_PRICE * qty;
  const discounted = UNIT_PRICE * qty;
  const discount = subtotal - discounted;
  const shippingCost = SHIPPING_OPTIONS.find((s) => s.id === shipping)?.price ?? 0;
  const total = discounted + shippingCost;

  const deliveryDay = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${d.getDate()} de ${months[d.getMonth()]}`;
  })();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-40">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <Link to="/" className="absolute left-3 p-1">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-base font-bold">Resumo do Pedido</h1>
        </header>

        {/* Endereço e CPF */}
        <div className="space-y-2 p-3">
          {address ? (
            <Link to="/address" className="block w-full rounded-lg bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold leading-tight">
                    {address.nome} {address.sobrenome}, {address.telefone}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 leading-snug">
                    {address.rua}, {address.numero}
                    {address.complemento ? `, ${address.complemento}` : ""}, {address.bairro}, {address.cidade}, {address.estado}, {address.cep}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />
              </div>
            </Link>
          ) : (
            <Link to="/address" className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-bold">
              <Plus className="h-4 w-4" /> Adicionar endereço de entrega
            </Link>
          )}
        </div>

        {/* Linha decorativa */}
        <div className="h-1 bg-[repeating-linear-gradient(90deg,#f43f5e_0,#f43f5e_8px,transparent_8px,transparent_14px,#0ea5e9_14px,#0ea5e9_22px,transparent_22px,transparent_28px)]" />

        {/* Loja / produto */}
        <div className="bg-white p-3">
          <div className="text-sm font-bold">Loja (2)</div>
          <div className="mt-2 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <Truck className="h-4 w-4" />
            <span>Você ganhou frete grátis!</span>
          </div>

          <div className="mt-3 flex gap-3">
            <img src={productImage} alt="" className="h-20 w-20 rounded-md object-cover" />
            <div className="flex-1">
              <div className="text-sm font-medium leading-snug">
                Cinta Modeladora Slim Belly — Cintura Alta
              </div>
              {(color || size) && (
                <div className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                  {[color, size].filter(Boolean).join(", ")}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-base font-bold text-rose-500">{brl(UNIT_PRICE)}</span>
                <Ticket className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <span className="text-zinc-400 line-through">{brl(ORIGINAL_PRICE)}</span>
                <span className="rounded bg-rose-100 px-1 py-0.5 font-semibold text-rose-600">-67%</span>
              </div>
              <div className="mt-2 flex justify-end">
                <div className="inline-flex items-center rounded-md bg-zinc-100">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid h-8 w-8 place-items-center text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="grid h-8 w-8 place-items-center text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Frete */}
        <div className="mt-2 bg-white p-3">
          <div className="text-sm font-bold">Frete</div>
          <div className="mt-2 space-y-3">
            {SHIPPING_OPTIONS.map((opt) => {
              const active = shipping === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setShipping(opt.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${
                        active ? "border-rose-500" : "border-zinc-300"
                      }`}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{opt.name}</div>
                      <div className="text-xs text-zinc-500">{opt.eta}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${opt.price === 0 ? "text-sky-600" : "text-zinc-700"}`}>
                    {opt.price === 0 ? "Grátis" : brl(opt.price)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-2 bg-white p-4">
          <div className="text-sm font-bold">Resumo do Pedido</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-600">Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-rose-500">Descontos</span><span className="text-rose-500">-{brl(discount)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Frete</span><span className={shippingCost === 0 ? "text-emerald-600 font-semibold" : ""}>{shippingCost === 0 ? "Grátis" : brl(shippingCost)}</span></div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3 flex items-end justify-between">
            <span className="text-base font-bold">Total</span>
            <div className="text-right">
              <div className="text-base font-bold">{brl(total)}</div>
              <div className="text-[11px] text-zinc-500">Impostos inclusos</div>
            </div>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="mt-2 bg-white p-4">
          <div className="text-sm font-bold">Forma de pagamento</div>
          <div className="mt-3 rounded-xl border-2 border-rose-500 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md">
                  <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
                    <path d="M16 4l5 5-5 5-5-5 5-5z" fill="#32BCAD"/>
                    <path d="M16 18l5 5-5 5-5-5 5-5z" fill="#32BCAD"/>
                    <path d="M4 16l5-5 5 5-5 5-5-5z" fill="#32BCAD"/>
                    <path d="M18 16l5-5 5 5-5 5-5-5z" fill="#32BCAD"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold">Pix</div>
                  <div className="text-xs text-zinc-500">Pague em até 15 minutos para receber seu produto até {deliveryDay}</div>
                </div>
              </div>
              <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-rose-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
            </div>
          </div>
        </div>

        {/* Selos */}
        <div className="mt-2 bg-white p-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-100 p-3 text-center">
            <div className="flex flex-col items-center gap-1 text-xs">
              <Shield className="h-5 w-5" />
              <span>Compra Segura</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-xs border-x border-zinc-200">
              <RefreshCw className="h-5 w-5" />
              <span>7 Dias Garantia</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-xs">
              <Lock className="h-5 w-5" />
              <span>Dados Protegidos</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex -space-x-2">
              {["N", "S", "Y"].map((l, i) => (
                <span key={i} className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">{l}</span>
              ))}
            </div>
            <span className="text-xs text-zinc-700"><strong>40 pessoas</strong> comprando agora</span>
          </div>
        </div>

        {/* Economia */}
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <Smile className="h-4 w-4" />
          <span>Você está economizando <strong>{brl(discount)}</strong> neste pedido.</span>
        </div>
      </div>

      {/* Bottom bar fixa */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-[480px] px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Total ({qty} {qty === 1 ? "item" : "itens"})</span>
            <span className="text-lg font-bold text-rose-500">{brl(total)}</span>
          </div>
          {payError && (
            <div className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-600">{payError}</div>
          )}
          <button
            disabled={paying}
            onClick={async () => {
              setPayError(null);
              if (!address) {
                setPayError("Adicione um endereço de entrega.");
                return;
              }
              setPaying(true);
              try {
                const phone = address.telefone.replace(/\D/g, "").replace(/^55/, "");
                const document = address.cpf.replace(/\D/g, "");
                const fn = provider === "freepay" ? freepay : klivo;
                const res = await fn({
                  data: {
                    amount: Math.round(total * 100),
                    customer: {
                      name: `${address.nome} ${address.sobrenome}`.trim(),
                      email: address.email,
                      phone,
                      document,
                    },
                    cart: [
                      {
                        name: `Cinta Slim Belly${color ? ` - ${color}` : ""}${size ? ` ${size}` : ""}`,
                        quantity: qty,
                        unit_price: Math.round(UNIT_PRICE * 100),
                      },
                    ],
                  },
                });
                if (!res.ok) {
                  setPayError(res.error);
                  return;
                }
                navigate({
                  to: "/pagamento",
                  search: { total, code: res.pix_copy_paste, hash: res.hash },
                });
              } catch (e) {
                setPayError("Erro de conexão. Tente novamente.");
              } finally {
                setPaying(false);
              }
            }}
            className="mt-2 block w-full rounded-lg bg-rose-500 py-3 text-center text-white shadow disabled:opacity-70"
          >
            <div className="text-base font-bold leading-tight">
              {paying ? "Gerando pagamento..." : "Fazer Pedido"}
            </div>
            <div className="text-[11px] leading-tight">O cupom expira em {time}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
