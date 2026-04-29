import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CardapioFormFields,
  emptyCategorias,
  flattenCategorias,
  groupItemsByCategoria,
  type CategoriaForm,
} from "@/components/CardapioFormFields";

interface CardapioItem {
  id: string;
  nome: string;
  cardapio_id: string;
  categoria?: string | null;
}

interface Cardapio {
  id: string;
  nome: string;
  valor_sugerido_pp: number;
  cardapio_itens?: CardapioItem[];
}

interface Props {
  cardapio: Cardapio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCardapioDialog({ cardapio, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [valorPP, setValorPP] = useState("");
  const [categorias, setCategorias] = useState<CategoriaForm[]>(emptyCategorias());

  useEffect(() => {
    if (cardapio) {
      setNome(cardapio.nome);
      setValorPP(String(cardapio.valor_sugerido_pp || ""));
      setCategorias(groupItemsByCategoria(cardapio.cardapio_itens ?? []));
    }
  }, [cardapio]);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!cardapio) return;

      const { error } = await supabase
        .from("cardapios")
        .update({ nome, valor_sugerido_pp: parseFloat(valorPP) || 0 })
        .eq("id", cardapio.id);
      if (error) throw error;

      const flat = flattenCategorias(categorias);

      // Delete removed items
      const keepIds = flat.filter((i) => i.id).map((i) => i.id!);
      const originalIds = cardapio.cardapio_itens?.map((i) => i.id) ?? [];
      const toDelete = originalIds.filter((id) => !keepIds.includes(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("cardapio_itens")
          .delete()
          .in("id", toDelete);
        if (delErr) throw delErr;
      }

      // Update existing items (nome + categoria)
      for (const item of flat.filter((i) => i.id)) {
        const { error: updErr } = await supabase
          .from("cardapio_itens")
          .update({ nome: item.nome, categoria: item.categoria })
          .eq("id", item.id!);
        if (updErr) throw updErr;
      }

      // Insert new items
      const newItems = flat.filter((i) => !i.id);
      if (newItems.length > 0) {
        const { error: insErr } = await supabase
          .from("cardapio_itens")
          .insert(newItems.map((i) => ({ cardapio_id: cardapio.id, nome: i.nome, categoria: i.categoria })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      onOpenChange(false);
      toast.success("Cardápio atualizado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar cardápio."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Editar Cardápio</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); updateMut.mutate(); }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Valor por Pessoa</Label>
                <Input type="number" step="0.01" value={valorPP} onChange={(e) => setValorPP(e.target.value)} className="mt-1" placeholder="0,00" />
              </div>
            </div>
            <CardapioFormFields categorias={categorias} onChange={setCategorias} />
          </div>
          <div className="shrink-0 border-t px-6 py-3 bg-background">
            <Button type="submit" className="w-full" size="sm" disabled={updateMut.isPending || !nome.trim()}>
              {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
