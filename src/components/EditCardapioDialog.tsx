import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface CardapioItem {
  id: string;
  nome: string;
  cardapio_id: string;
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
  const [itens, setItens] = useState<{ id?: string; nome: string }[]>([{ nome: "" }]);

  useEffect(() => {
    if (cardapio) {
      setNome(cardapio.nome);
      setValorPP(String(cardapio.valor_sugerido_pp || ""));
      const existing = cardapio.cardapio_itens?.map((i) => ({ id: i.id, nome: i.nome })) ?? [];
      setItens(existing.length > 0 ? existing : [{ nome: "" }]);
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

      // Delete removed items
      const keepIds = itens.filter((i) => i.id).map((i) => i.id!);
      const originalIds = cardapio.cardapio_itens?.map((i) => i.id) ?? [];
      const toDelete = originalIds.filter((id) => !keepIds.includes(id));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("cardapio_itens")
          .delete()
          .in("id", toDelete);
        if (delErr) throw delErr;
      }

      // Update existing items
      for (const item of itens.filter((i) => i.id && i.nome.trim())) {
        const { error: updErr } = await supabase
          .from("cardapio_itens")
          .update({ nome: item.nome.trim() })
          .eq("id", item.id!);
        if (updErr) throw updErr;
      }

      // Insert new items
      const newItems = itens.filter((i) => !i.id && i.nome.trim());
      if (newItems.length > 0) {
        const { error: insErr } = await supabase
          .from("cardapio_itens")
          .insert(newItems.map((i) => ({ cardapio_id: cardapio.id, nome: i.nome.trim() })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      onOpenChange(false);
      toast.success("Cardápio atualizado!");
    },
  });

  const addItem = () => setItens([...itens, { nome: "" }]);
  const updateItem = (idx: number, val: string) => {
    const copy = [...itens];
    copy[idx] = { ...copy[idx], nome: val };
    setItens(copy);
  };
  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Cardápio</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate(); }} className="space-y-3">
          <div><Label className="text-xs">Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1" /></div>
          <div><Label className="text-xs">Valor Sugerido por Pessoa</Label><Input type="number" step="0.01" value={valorPP} onChange={(e) => setValorPP(e.target.value)} className="mt-1" /></div>
          <div>
            <Label className="text-xs">Itens do Cardápio</Label>
            <div className="space-y-2 mt-1.5">
              {itens.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder={`Item ${idx + 1}`} value={item.nome} onChange={(e) => updateItem(idx, e.target.value)} />
                  {itens.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => removeItem(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs">
                <Plus className="h-3 w-3 mr-1" />Adicionar Item
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" size="sm" disabled={updateMut.isPending}>Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
