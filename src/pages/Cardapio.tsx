import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, itemTipoLabels } from "@/lib/formatters";

export default function Cardapio() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"itens_cardapio">>>({});

  const { data: itens = [] } = useQuery({
    queryKey: ["itens_cardapio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itens_cardapio").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: TablesInsert<"itens_cardapio">) => {
      const { error } = await supabase.from("itens_cardapio").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["itens_cardapio"] }); setOpen(false); setForm({}); toast.success("Item cadastrado!"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itens_cardapio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["itens_cardapio"] }); toast.success("Item removido!"); },
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Cardápio</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Item do Cardápio</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form as TablesInsert<"itens_cardapio">); }} className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div>
                <Label>Tipo *</Label>
                <Select value={form.tipo ?? ""} onValueChange={(v) => setForm({ ...form, tipo: v as Enums<"item_tipo"> })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.item_tipo.map((t) => <SelectItem key={t} value={t}>{itemTipoLabels[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Custo Unitário *</Label><Input type="number" step="0.01" value={form.custo_unitario ?? ""} onChange={(e) => setForm({ ...form, custo_unitario: parseFloat(e.target.value) })} required /></div>
              <Button type="submit" className="w-full">Cadastrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Custo Unitário</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {itens.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline">{itemTipoLabels[i.tipo]}</Badge></TableCell>
                <TableCell>{formatCurrency(i.custo_unitario)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {itens.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum item cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
