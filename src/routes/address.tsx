import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/address")({
  head: () => ({
    meta: [
      { title: "Adicionar novo endereço" },
      { name: "description", content: "Cadastre seu endereço de entrega." },
    ],
  }),
  component: AddressPage,
});

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// Validadores
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

// Máscaras
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
  nome: string; sobrenome: string; telefone: string; email: string; cpf: string;
  cep: string; estado: string; cidade: string; bairro: string; rua: string; numero: string; complemento: string;
};

const empty: Values = {
  nome: "", sobrenome: "", telefone: "", email: "", cpf: "",
  cep: "", estado: "", cidade: "", bairro: "", rua: "", numero: "", complemento: "",
};

function AddressPage() {
  const navigate = useNavigate();
  const [v, setV] = useState<Values>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [cepLoading, setCepLoading] = useState(false);

  const set = <K extends keyof Values>(k: K, val: Values[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  // Auto-fill via ViaCEP
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

  const errors = useMemo(() => ({
    nome: v.nome.trim() ? null : "Digite o nome",
    sobrenome: v.sobrenome.trim() ? null : "Digite o sobrenome",
    telefone: validatePhone(v.telefone) ? null : "Telefone inválido",
    email: /^\S+@\S+\.\S+$/.test(v.email) ? null : "E-mail inválido",
    cpf: validateCPF(v.cpf) ? null : "CPF inválido",
    cep: validateCEP(v.cep) ? null : "CEP inválido",
    estado: v.estado ? null : "UF",
    cidade: v.cidade.trim() ? null : "Cidade",
    bairro: v.bairro.trim() ? null : "Bairro",
    rua: v.rua.trim() ? null : "Rua",
    numero: v.numero.trim() ? null : "Número",
  }), [v]);

  const isValid = Object.values(errors).every((e) => !e);

  const fieldCls = "w-full bg-transparent text-sm placeholder:text-zinc-400 outline-none";
  const wrap = "px-4 py-3 border-b border-zinc-100 last:border-b-0";

  const err = (k: keyof typeof errors) =>
    touched[k] && errors[k] ? <div className="mt-1 text-xs text-rose-500">{errors[k]}</div> : null;

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
        <div className="bg-white">
          <div className={wrap}>
            <input className={fieldCls} placeholder="Nome" value={v.nome}
              onChange={(e) => set("nome", e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, nome: true }))} />
            {err("nome")}
          </div>
          <div className={wrap}>
            <input className={fieldCls} placeholder="Sobrenome" value={v.sobrenome}
              onChange={(e) => set("sobrenome", e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, sobrenome: true }))} />
            {err("sobrenome")}
          </div>
          <div className={wrap}>
            <div className="flex items-center gap-2">
              <span className="select-none text-sm text-zinc-400 shrink-0">BR +55</span>
              <input className={fieldCls} placeholder="(00) 00000-0000" inputMode="tel"
                value={v.telefone}
                onChange={(e) => set("telefone", maskPhone(e.target.value))}
                onBlur={() => setTouched((s) => ({ ...s, telefone: true }))} />
            </div>
            {err("telefone")}
          </div>
          <div className={wrap}>
            <input className={fieldCls} placeholder="E-mail" type="email" value={v.email}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, email: true }))} />
            {err("email")}
          </div>
          <div className={wrap}>
            <input className={fieldCls} placeholder="CPF" inputMode="numeric" value={v.cpf}
              onChange={(e) => set("cpf", maskCPF(e.target.value))}
              onBlur={() => setTouched((s) => ({ ...s, cpf: true }))} />
            {err("cpf")}
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 text-sm font-bold">Informações de endereço</div>
        <div className="bg-white">
          <div className={wrap}>
            <input className={fieldCls} placeholder="CEP/Código postal" inputMode="numeric" value={v.cep}
              onChange={(e) => set("cep", maskCEP(e.target.value))}
              onBlur={() => setTouched((s) => ({ ...s, cep: true }))} />
            {cepLoading && <div className="mt-1 text-xs text-zinc-400">Buscando endereço...</div>}
            {err("cep")}
          </div>
          <div className="flex border-b border-zinc-100">
            <div className="w-1/2 px-4 py-3 border-r border-zinc-100">
              <div className="relative">
                <select className={`${fieldCls} appearance-none pr-6 ${v.estado ? "" : "text-zinc-400"}`}
                  value={v.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, estado: true }))}>
                  <option value="">UF</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="w-1/2 px-4 py-3">
              <input className={fieldCls} placeholder="Cidade" value={v.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, cidade: true }))} />
            </div>
          </div>
          <div className={wrap}>
            <input className={fieldCls} placeholder="Bairro" value={v.bairro}
              onChange={(e) => set("bairro", e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, bairro: true }))} />
          </div>
          <div className={wrap}>
            <input className={fieldCls} placeholder="Rua" value={v.rua}
              onChange={(e) => set("rua", e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, rua: true }))} />
          </div>
          <div className="flex border-b border-zinc-100">
            <div className="w-1/2 px-4 py-3 border-r border-zinc-100">
              <input className={fieldCls} placeholder="Número" inputMode="numeric" value={v.numero}
                onChange={(e) => set("numero", e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, numero: true }))} />
            </div>
            <div className="w-1/2 px-4 py-3">
              <input className={fieldCls} placeholder="Complemento (até)" value={v.complemento}
                onChange={(e) => set("complemento", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-[480px] px-3 py-3">
          <button
            disabled={!isValid}
            onClick={() => {
              if (!isValid) {
                setTouched({ nome: true, sobrenome: true, telefone: true, email: true, cpf: true, cep: true, estado: true, cidade: true, bairro: true, rua: true, numero: true });
                return;
              }
              try {
                localStorage.setItem("slimbelly:address", JSON.stringify({ ...v, telefone: `+55 ${v.telefone}` }));
              } catch {}
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
