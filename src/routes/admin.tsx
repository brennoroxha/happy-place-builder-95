import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Lock,
  LogOut,
} from "lucide-react";
import {
  groupByDate,
  isPaymentDeviation,
  loadOrders,
  saveOrders,
  updateOrder,
  type Order,
} from "@/lib/orders";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Provedor de pagamento" },
      { name: "description", content: "Escolha o gateway de pagamento." },
    ],
  }),
  component: AdminGate,
});

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "g!8594221G";
const AUTH_KEY = "slimbelly:admin-auth";

function AdminGate() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(AUTH_KEY) === "1");
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return <AdminPage onLogout={() => setAuthed(false)} />;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      email.trim().toLowerCase() === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      try {
        sessionStorage.setItem(AUTH_KEY, "1");
      } catch {}
      onSuccess();
    } else {
      setError("E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[420px] px-4 pt-20">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100">
            <Lock className="h-6 w-6 text-rose-500" />
          </div>
          <h1 className="mt-4 text-center text-lg font-extrabold">
            Acesso restrito
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-500">
            Entre com suas credenciais de administrador.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
              />
            </div>
            {error && (
              <div className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-600">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow"
            >
              Entrar
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-zinc-500 underline">
              Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type Provider = "klivopay" | "freepay";
const KEY = "slimbelly:provider";

const OPTIONS: { id: Provider; name: string; desc: string }[] = [
  { id: "klivopay", name: "KlivoPay", desc: "Gateway Pix via KlivoPay (Pagar.me)." },
  { id: "freepay", name: "Freepay", desc: "Gateway Pix via Freepay Brasil." },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [provider, setProvider] = useState<Provider>("klivopay");
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const refresh = () => setOrders(loadOrders());

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Provider | null;
      if (v === "klivopay" || v === "freepay") setProvider(v);
    } catch {}
    refresh();
  }, []);

  const save = () => {
    try {
      localStorage.setItem(KEY, provider);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {}
  };

  const grouped = groupByDate(orders);
  const deviations = orders.filter(isPaymentDeviation);

  const markConfirmed = (hash: string) => {
    updateOrder(hash, { status: "confirmed" });
    refresh();
  };

  const clearAll = () => {
    if (!confirm("Apagar todos os pedidos locais?")) return;
    saveOrders([]);
    refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[640px] pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <Link to="/" className="absolute left-3 p-1">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-base font-bold">Admin</h1>
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem(AUTH_KEY);
              } catch {}
              onLogout();
            }}
            className="absolute right-3 flex items-center gap-1 p-1 text-xs font-bold text-zinc-600"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Provedor */}
        <div className="m-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold">Provedor de pagamento Pix</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Selecione qual gateway será usado para gerar o Pix no checkout.
          </p>

          <div className="mt-4 space-y-2">
            {OPTIONS.map((opt) => {
              const active = provider === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setProvider(opt.id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border-2 p-3 text-left ${
                    active ? "border-rose-500 bg-rose-50/30" : "border-zinc-200"
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold">{opt.name}</div>
                    <div className="text-xs text-zinc-500">{opt.desc}</div>
                  </div>
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-rose-500" : "border-zinc-300"
                    }`}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={save}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow"
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo!" : "Salvar"}
          </button>

          <div className="mt-3 text-xs text-zinc-500">
            Ativo agora: <strong className="text-zinc-700">{provider}</strong>
          </div>
        </div>

        {/* Alerta de desvio */}
        {deviations.length > 0 && (
          <div className="mx-3 mt-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {deviations.length} desvio(s) de pagamento do gateway
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Pedidos com comprovante enviado, mas ainda pendentes no gateway.
              Verifique manualmente.
            </p>
          </div>
        )}

        {/* Pedidos */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Pedidos ({orders.length})</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200"
                title="Atualizar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {orders.length > 0 && (
                <button
                  onClick={clearAll}
                  className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 text-rose-600"
                  title="Limpar pedidos"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {orders.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">Nenhum pedido registrado ainda.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {grouped.map(({ date, items }) => (
                <div key={date}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    {fmtDate(date)}
                  </div>
                  <div className="space-y-2">
                    {items.map((o) => {
                      const deviation = isPaymentDeviation(o);
                      return (
                        <div
                          key={o.hash}
                          className={`rounded-lg border p-3 ${
                            deviation
                              ? "border-amber-400 bg-amber-50"
                              : "border-zinc-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold">
                                  {brl(o.total)}
                                </span>
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-600">
                                  {o.provider}
                                </span>
                                {o.status === "confirmed" ? (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Confirmado
                                  </span>
                                ) : (
                                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                                    Pendente
                                  </span>
                                )}
                                {deviation && (
                                  <span className="flex items-center gap-1 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    <AlertTriangle className="h-3 w-3" />
                                    Desvio do gateway
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-zinc-700">
                                {o.customer?.name || "—"}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {o.customer?.email}
                                {o.customer?.phone ? ` · ${o.customer.phone}` : ""}
                              </div>
                              <div className="mt-1 text-[11px] text-zinc-400">
                                {fmtTime(o.createdAt)} · hash {o.hash.slice(0, 10)}…
                              </div>
                            </div>
                            {o.proofDataUrl && (
                              <button
                                onClick={() => setPreview(o.proofDataUrl!)}
                                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
                                title="Ver comprovante"
                              >
                                <img
                                  src={o.proofDataUrl}
                                  alt="comprovante"
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            )}
                          </div>

                          {o.proofDataUrl ? (
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
                              <ImageIcon className="h-3 w-3" />
                              Comprovante enviado
                              {o.proofUploadedAt
                                ? ` ${fmtTime(o.proofUploadedAt)}`
                                : ""}
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-zinc-400">
                              Sem comprovante
                            </div>
                          )}

                          {o.status === "pending" && (
                            <button
                              onClick={() => markConfirmed(o.hash)}
                              className="mt-2 w-full rounded-md bg-emerald-600 py-1.5 text-xs font-bold text-white"
                            >
                              Marcar como confirmado
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm text-xs text-zinc-500">
          Pedidos e comprovantes ficam salvos localmente neste navegador.
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
        >
          <img
            src={preview}
            alt="Comprovante"
            className="max-h-[90vh] max-w-full rounded-lg bg-white"
          />
        </div>
      )}
    </div>
  );
}
