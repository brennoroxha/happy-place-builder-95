import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Provedor de pagamento" },
      { name: "description", content: "Escolha o gateway de pagamento." },
    ],
  }),
  component: AdminPage,
});

type Provider = "klivopay" | "freepay";
const KEY = "slimbelly:provider";

const OPTIONS: { id: Provider; name: string; desc: string }[] = [
  { id: "klivopay", name: "KlivoPay", desc: "Gateway Pix via KlivoPay (Pagar.me)." },
  { id: "freepay", name: "Freepay", desc: "Gateway Pix via Freepay Brasil." },
];

function AdminPage() {
  const [provider, setProvider] = useState<Provider>("klivopay");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Provider | null;
      if (v === "klivopay" || v === "freepay") setProvider(v);
    } catch {}
  }, []);

  const save = () => {
    try {
      localStorage.setItem(KEY, provider);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <Link to="/" className="absolute left-3 p-1">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-base font-bold">Admin</h1>
        </header>

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

        <div className="mx-3 mt-3 rounded-lg bg-white p-4 shadow-sm text-xs text-zinc-500">
          As chaves de cada provedor ficam guardadas como secrets no servidor.
          Esta tela apenas alterna qual será usado no botão "Fazer Pedido".
        </div>
      </div>
    </div>
  );
}
