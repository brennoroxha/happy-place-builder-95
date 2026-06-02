import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Lock,
  LogOut,
} from "lucide-react";
import {
  getActiveProvider,
  setActiveProvider,
  listSales,
  markSaleConfirmed,
  type AdminSale,
} from "@/lib/admin.functions";

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

type ProviderLocal = Provider;
const KEY = "slimbelly:provider";

const OPTIONS: { id: ProviderLocal; name: string; desc: string }[] = [
  { id: "klivopay", name: "KlivoPay · Conta 1", desc: "Gateway Pix via KlivoPay (conta principal)." },
  { id: "klivopay2", name: "KlivoPay · Conta 2", desc: "Gateway Pix via KlivoPay (segunda conta)." },
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


function groupSalesByDate(sales: AdminSale[]) {
  const map = new Map<string, AdminSale[]>();
  for (const s of sales) {
    const key = new Date(s.createdAt).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }));
}

const isPaid = (s: AdminSale) => s.status === "paid";
const saleTotal = (s: AdminSale) => (s.amountCents ?? 0) / 100;

type Tab = "slimbelly" | "panini";

function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("slimbelly");
  const [provider, setProvider] = useState<Provider>("klivopay");
  const [paniniProvider, setPaniniProvider] = useState<Provider>("klivopay");
  const [saved, setSaved] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [sales, setSales] = useState<AdminSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchProvider = useServerFn(getActiveProvider);
  const saveProviderFn = useServerFn(setActiveProvider);
  const fetchSales = useServerFn(listSales);
  const confirmSale = useServerFn(markSaleConfirmed);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetchSales();
      setSales(r.sales);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvider({ data: {} })
      .then((r) => setProvider(r.provider))
      .catch(() => {});
    fetchProvider({ data: { scope: "panini" } })
      .then((r) => setPaniniProvider(r.provider))
      .catch(() => {});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSavingProvider(true);
    try {
      if (tab === "panini") {
        await saveProviderFn({ data: { provider: paniniProvider, scope: "panini" } });
      } else {
        await saveProviderFn({ data: { provider } });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProvider(false);
    }
  };

  const scopedSales = sales.filter((s) => s.scope === tab);
  const grouped = groupSalesByDate(scopedSales);

  const markConfirmed = async (hash: string) => {
    try {
      await confirmSale({ data: { hash } });
      await refresh();
    } catch (e) {
      console.error(e);
    }
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

        {/* Tabs */}
        <div className="mx-3 mt-3 flex gap-2 rounded-lg bg-white p-1 shadow-sm">
          {([
            { id: "slimbelly", label: "Slim Belly" },
            { id: "panini", label: "Panini" },
          ] as { id: Tab; label: string }[]).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-md py-2 text-sm font-bold ${
                  active ? "bg-rose-500 text-white" : "text-zinc-600"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Provedor */}
        <div className="m-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold">
            Provedor de pagamento Pix · {tab === "panini" ? "Panini" : "Slim Belly"}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Selecione qual gateway será usado para gerar o Pix no checkout
            {tab === "panini" ? " da Panini" : " da Slim Belly"}.
          </p>

          <div className="mt-4 space-y-2">
            {OPTIONS.map((opt) => {
              const current = tab === "panini" ? paniniProvider : provider;
              const setCurrent = tab === "panini" ? setPaniniProvider : setProvider;
              const active = current === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setCurrent(opt.id)}
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
            disabled={savingProvider}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-3 text-sm font-bold text-white shadow disabled:opacity-70"
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo!" : savingProvider ? "Salvando..." : "Salvar"}
          </button>

          <div className="mt-3 text-xs text-zinc-500">
            Ativo agora:{" "}
            <strong className="text-zinc-700">
              {tab === "panini" ? paniniProvider : provider}
            </strong>
          </div>
        </div>

        <>




        {/* Dashboard do dia */}
        {(() => {
          const todayKey = new Date().toISOString().slice(0, 10);
          const todayItems = scopedSales.filter(
            (o) => new Date(o.createdAt).toISOString().slice(0, 10) === todayKey,
          );
          const paid = todayItems.filter(isPaid);
          const pending = todayItems.filter((o) => !isPaid(o));
          const totalPaid = paid.reduce((s, o) => s + saleTotal(o), 0);
          const totalPending = pending.reduce((s, o) => s + saleTotal(o), 0);
          return (
            <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Resumo de hoje</h2>
                <span className="text-[11px] text-zinc-500">
                  {new Date().toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">
                    Pagos
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-700">
                    {paid.length}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    {brl(totalPaid)}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-zinc-600">
                    Pendentes
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-700">
                    {pending.length}
                  </div>
                  <div className="text-xs font-semibold text-zinc-700">
                    {brl(totalPending)}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Pedidos */}
        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Pedidos ({scopedSales.length})</h2>
            <button
              onClick={refresh}
              className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-xs text-zinc-500">Carregando...</p>
          ) : scopedSales.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">Nenhum pedido registrado ainda.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {grouped.map(({ date, items }) => {
                const paidItems = items.filter(isPaid);
                const pendingItems = items.filter((o) => !isPaid(o));
                const totalPaid = paidItems.reduce((s, o) => s + saleTotal(o), 0);
                const totalPending = pendingItems.reduce((s, o) => s + saleTotal(o), 0);
                return (
                  <div key={date}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {fmtDate(date)}
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                        <div className="text-[10px] font-bold uppercase text-emerald-700">Pagos</div>
                        <div className="mt-0.5 text-base font-extrabold text-emerald-700">{paidItems.length}</div>
                        <div className="text-[11px] font-semibold text-emerald-700">{brl(totalPaid)}</div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                        <div className="text-[10px] font-bold uppercase text-zinc-600">Pendentes</div>
                        <div className="mt-0.5 text-base font-extrabold text-zinc-700">{pendingItems.length}</div>
                        <div className="text-[11px] font-semibold text-zinc-700">{brl(totalPending)}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {items.map((o) => {
                        const paidStatus = isPaid(o);
                        return (
                          <div
                            key={o.hash}
                            className="rounded-lg border border-zinc-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold">
                                    {brl(saleTotal(o))}
                                  </span>
                                  {o.provider && (
                                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-600">
                                      {o.provider}
                                    </span>
                                  )}
                                  {paidStatus ? (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                      Confirmado
                                    </span>
                                  ) : (
                                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                                      {o.status === "waiting_payment" ? "Pendente" : o.status}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-zinc-700">
                                  {o.customerName || "—"}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {o.customerEmail}
                                  {o.customerPhone ? ` · ${o.customerPhone}` : ""}
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
                            ) : null}

                            {!paidStatus && (
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
                );
              })}
            </div>
          )}
        </div>
        </>
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

