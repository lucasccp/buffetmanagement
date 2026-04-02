import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Eye, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function Cardapio() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [valorPP, setValorPP] = useState("");
  const [itensNomes, setItensNomes] = useState<string[]>([""]);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("*, cardapio_itens(*)").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("cardapios").insert({ nome, valor_sugerido_pp: parseFloat(valorPP) || 0 }).select().single();
      if (error) throw error;
      const validItens = itensNomes.filter((n) => n.trim());
      if (validItens.length > 0) {
        const { error: err2 } = await supabase.from("cardapio_itens").insert(validItens.map((n) => ({ cardapio_id: data.id, nome: n.trim() })));
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      setOpen(false);
      setNome("");
      setValorPP("");
      setItensNomes([""]);
      toast.success("Cardápio cadastrado!");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cardapios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      toast.success("Cardápio removido!");
    },
  });

  const addItemField = () => setItensNomes([...itensNomes, ""]);
  const updateItemField = (idx: number, val: string) => {
    const copy = [...itensNomes];
    copy[idx] = val;
    setItensNomes(copy);
  };
  const removeItemField = (idx: number) => setItensNomes(itensNomes.filter((_, i) => i !== idx));

  const viewCardapio = cardapios.find((c) => c.id === viewId);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Cardápios</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Cardápio</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Cardápio</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-4">
              <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
              <div><Label>Valor Sugerido por Pessoa</Label><Input type="number" step="0.01" value={valorPP} onChange={(e) => setValorPP(e.target.value)} /></div>
              <div>
                <Label>Itens do Cardápio</Label>
                <div className="space-y-2 mt-1">
                  {itensNomes.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder={`Item ${idx + 1}`} value={item} onChange={(e) => updateItemField(idx, e.target.value)} />
                      {itensNomes.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItemField(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItemField}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar Item
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Cadastrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Valor/Pessoa</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cardapios.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{formatCurrency(c.valor_sugerido_pp)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.cardapio_itens?.slice(0, 3).map((i: any) => (
                      <Badge key={i.id} variant="outline">{i.nome}</Badge>
                    ))}
                    {c.cardapio_itens?.length > 3 && <Badge variant="secondary">+{c.cardapio_itens.length - 3}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewId(c.id)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {cardapios.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum cardápio cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View detail dialog */}
      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewCardapio?.nome}</DialogTitle></DialogHeader>
          {viewCardapio && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Valor sugerido por pessoa: <span className="font-semibold text-foreground">{formatCurrency(viewCardapio.valor_sugerido_pp)}</span></p>
              <div>
                <Label>Itens</Label>
                <div className="mt-1 space-y-1">
                  {viewCardapio.cardapio_itens?.map((i: any) => (
                    <div key={i.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {i.nome}
                    </div>
                  ))}
                  {(!viewCardapio.cardapio_itens || viewCardapio.cardapio_itens.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhum item</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
