import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/address")({
  head: () => ({
    meta: [
      { title: "Adicionar novo endereço" },
      { name: "description", content: "Cadastre seu endereço de entrega." },
    ],
  }),
  component: AddressPage,
});

type Field = {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  validate?: (v: string) => string | null;
};

const contactFields: Field[] = [
  { key: "nome", label: "Nome", required: true, validate: (v) => (v.trim() ? null : "Digite o nome") },
  { key: "sobrenome", label: "Sobrenome", required: true, validate: (v) => (v.trim() ? null : "Digite o sobrenome") },
  {
    key: "telefone",
    label: "BR +55",
    type: "tel",
    required: true,
    validate: (v) => (v.replace(/\D/g, "").length >= 10 ? null : "Digite um telefone válido"),
  },
  {
    key: "email",
    label: "E-mail",
    type: "email",
    required: true,
    validate: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : "Digite um e-mail válido"),
  },
];

const addressFields: Field[] = [
  {
    key: "cep",
    label: "CEP/Código postal",
    required: true,
    validate: (v) => (v.replace(/\D/g, "").length === 8 ? null : "Digite um CEP válido"),
  },
];

function AddressPage() {
  const navigate = useNavigate();
  const all = [...contactFields, ...addressFields];
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    for (const f of all) e[f.key] = f.validate ? f.validate(values[f.key] ?? "") : null;
    return e;
  }, [values]);

  const isValid = all.every((f) => !errors[f.key]);

  const renderField = (f: Field) => {
    const v = values[f.key] ?? "";
    const showErr = touched[f.key] && errors[f.key];
    return (
      <div key={f.key} className="px-4 py-3 border-b border-zinc-100 last:border-b-0">
        <input
          type={f.type || "text"}
          value={v}
          placeholder={f.label}
          onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
          onBlur={() => setTouched((s) => ({ ...s, [f.key]: true }))}
          className="w-full bg-transparent text-sm placeholder:text-zinc-400 outline-none"
        />
        {showErr && <div className="mt-1 text-xs text-rose-500">{errors[f.key]}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-[480px] pb-28">
        <header className="sticky top-0 z-20 flex items-center justify-center bg-white px-4 py-3 border-b border-zinc-100">
          <Link to="/checkout" className="absolute left-3 p-1">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-base font-bold">Adicionar o novo endereço</h1>
        </header>

        <div className="px-4 pt-4 pb-2 text-sm font-bold">Informações de contato</div>
        <div className="bg-white">{contactFields.map(renderField)}</div>

        <div className="px-4 pt-4 pb-2 text-sm font-bold">Informações de endereço</div>
        <div className="bg-white">{addressFields.map(renderField)}</div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-[480px] px-3 py-3">
          <button
            disabled={!isValid}
            onClick={() => {
              if (!isValid) {
                setTouched(Object.fromEntries(all.map((f) => [f.key, true])));
                return;
              }
              navigate({ to: "/checkout" });
            }}
            className={`w-full rounded-lg py-3 text-sm font-bold transition ${
              isValid ? "bg-rose-500 text-white shadow" : "bg-zinc-300 text-white cursor-not-allowed"
            }`}
          >
            Salvar endereço
          </button>
        </div>
      </div>
    </div>
  );
}
