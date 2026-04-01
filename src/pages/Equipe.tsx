import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function Equipe() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"equipe">>>({});

  const { data: equipe = [] } = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: TablesInsert<"equipe">) => {
      const { error } = await supabase.from("equipe").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipe"] }); setOpen(false); setForm({}); toast.success("Membro cadastrado!"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipe").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipe"] }); toast.success("Membro removido!"); },
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Equipe</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Membro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Membro</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form as TablesInsert<"equipe">); }} className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>Função</Label><Input value={form.funcao ?? ""} onChange={(e) => setForm({ ...form, funcao: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>Custo por Evento</Label><Input type="number" step="0.01" value={form.custo_por_evento ?? ""} onChange={(e) => setForm({ ...form, custo_por_evento: parseFloat(e.target.value) || undefined })} /></div>
              <Button type="submit" className="w-full">Cadastrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Função</TableHead><TableHead>Telefone</TableHead><TableHead>Custo/Evento</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {equipe.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell>{e.funcao ?? "—"}</TableCell>
                <TableCell>{e.telefone ?? "—"}</TableCell>
                <TableCell>{formatCurrency(e.custo_por_evento)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {equipe.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum membro cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
