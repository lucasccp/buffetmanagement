import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

export interface CategoriaForm {
  nome: string;
  itens: { id?: string; nome: string }[];
}

interface Props {
  categorias: CategoriaForm[];
  onChange: (next: CategoriaForm[]) => void;
}

export function CardapioFormFields({ categorias, onChange }: Props) {
  const itemRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = (next: CategoriaForm[]) => onChange(next);

  const addCategoria = () => {
    update([...categorias, { nome: "", itens: [{ nome: "" }] }]);
  };

  const removeCategoria = (idx: number) => {
    update(categorias.filter((_, i) => i !== idx));
  };

  const moveCategoria = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= categorias.length) return;
    const copy = [...categorias];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    update(copy);
  };

  const updateCategoriaNome = (idx: number, nome: string) => {
    const copy = [...categorias];
    copy[idx] = { ...copy[idx], nome };
    update(copy);
  };

  const addItem = (catIdx: number) => {
    const copy = [...categorias];
    copy[catIdx] = { ...copy[catIdx], itens: [...copy[catIdx].itens, { nome: "" }] };
    update(copy);
    // focus the newly added input on next tick
    setTimeout(() => {
      const key = `${catIdx}-${copy[catIdx].itens.length - 1}`;
      itemRefs.current[key]?.focus();
    }, 0);
  };

  const updateItem = (catIdx: number, itemIdx: number, nome: string) => {
    const copy = [...categorias];
    const itens = [...copy[catIdx].itens];
    itens[itemIdx] = { ...itens[itemIdx], nome };
    copy[catIdx] = { ...copy[catIdx], itens };
    update(copy);
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    const copy = [...categorias];
    const itens = copy[catIdx].itens.filter((_, i) => i !== itemIdx);
    copy[catIdx] = { ...copy[catIdx], itens: itens.length ? itens : [{ nome: "" }] };
    update(copy);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Itens do Cardápio</Label>

      <div className="space-y-3">
        {categorias.map((cat, catIdx) => (
          <div key={catIdx} className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Input
                value={cat.nome}
                onChange={(e) => updateCategoriaNome(catIdx, e.target.value)}
                placeholder="Nome da categoria (ex: Entradas)"
                className="h-9 font-medium"
              />
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => moveCategoria(catIdx, -1)}
                  disabled={catIdx === 0}
                  aria-label="Mover categoria para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => moveCategoria(catIdx, 1)}
                  disabled={catIdx === categorias.length - 1}
                  aria-label="Mover categoria para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeCategoria(catIdx)}
                  aria-label="Remover categoria"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pl-1">
              {cat.itens.map((item, itemIdx) => {
                const key = `${catIdx}-${itemIdx}`;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                    <Input
                      ref={(el) => (itemRefs.current[key] = el)}
                      value={item.nome}
                      onChange={(e) => updateItem(catIdx, itemIdx, e.target.value)}
                      placeholder={`Item ${itemIdx + 1}`}
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (itemIdx === cat.itens.length - 1) {
                            addItem(catIdx);
                          } else {
                            const nextKey = `${catIdx}-${itemIdx + 1}`;
                            itemRefs.current[nextKey]?.focus();
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(catIdx, itemIdx)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addItem(catIdx)}
                className="text-xs h-8 ml-3.5"
              >
                <Plus className="h-3 w-3 mr-1" />Adicionar item
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCategoria}
        className="w-full text-xs border-dashed"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />Adicionar categoria
      </Button>
    </div>
  );
}

// Helpers usados pelas páginas
export function emptyCategorias(): CategoriaForm[] {
  return [{ nome: "Geral", itens: [{ nome: "" }] }];
}

export function groupItemsByCategoria(
  itens: { id: string; nome: string; categoria?: string | null }[],
): CategoriaForm[] {
  if (!itens || itens.length === 0) return emptyCategorias();
  const map = new Map<string, CategoriaForm>();
  for (const it of itens) {
    const key = (it.categoria ?? "").trim() || "Sem categoria";
    if (!map.has(key)) map.set(key, { nome: key, itens: [] });
    map.get(key)!.itens.push({ id: it.id, nome: it.nome });
  }
  return Array.from(map.values());
}

export function flattenCategorias(
  categorias: CategoriaForm[],
): { nome: string; categoria: string | null; id?: string }[] {
  const out: { nome: string; categoria: string | null; id?: string }[] = [];
  for (const cat of categorias) {
    const catNome = cat.nome.trim() || null;
    for (const item of cat.itens) {
      const nome = item.nome.trim();
      if (!nome) continue;
      out.push({ nome, categoria: catNome, id: item.id });
    }
  }
  return out;
}
