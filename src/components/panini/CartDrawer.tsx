import { useNavigate } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { usePaniniCart } from "@/lib/panini-cart";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CartDrawer() {
  const { open, setOpen, items, subtotal, setQty, remove, count } = usePaniniCart();
  const navigate = useNavigate();

  const finalize = () => {
    if (!items.length) return;
    setOpen(false);
    const first = items[0];
    navigate({ to: "/checkout", search: { color: first.name, size: "Único" } });
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-rose-600" />
            <h3 className="text-base font-bold">Meu carrinho ({count})</h3>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-zinc-500">
              <div>
                <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
                <p className="text-sm">Seu carrinho está vazio</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.slug} className="flex gap-3 rounded-xl border border-zinc-100 p-2">
                  <img src={it.img} alt={it.name} className="h-20 w-20 flex-shrink-0 rounded-md object-contain bg-zinc-50" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="line-clamp-2 text-xs font-semibold text-zinc-900">{it.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(it.slug, it.qty - 1)}
                          className="grid h-7 w-7 place-items-center rounded-md border border-zinc-200"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.qty}</span>
                        <button
                          onClick={() => setQty(it.slug, it.qty + 1)}
                          className="grid h-7 w-7 place-items-center rounded-md border border-zinc-200"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-rose-600">{brl(it.qty * it.price)}</span>
                        <button onClick={() => remove(it.slug)} aria-label="Remover" className="text-zinc-400 hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-zinc-200 px-4 py-3">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-zinc-600">Total (itens):</span>
            <span className="text-lg font-bold text-zinc-900">{brl(subtotal)}</span>
          </div>
          <button
            onClick={finalize}
            disabled={items.length === 0}
            className="w-full rounded-full bg-rose-600 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Finalizar compra
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-full border border-zinc-300 py-3 text-sm font-bold text-zinc-700"
          >
            Continuar comprando
          </button>
        </footer>
      </aside>
    </>
  );
}
