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
import { Plus } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
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
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Equipe</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Membro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Membro</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form as TablesInsert<"equipe">); }} className="space-y-3">
                <div><Label className="text-xs">Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="mt-1" /></div>
                <div><Label className="text-xs">Função</Label><Input value={form.funcao ?? ""} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Custo por Evento</Label><Input type="number" step="0.01" value={form.custo_por_evento ?? ""} onChange={(e) => setForm({ ...form, custo_por_evento: parseFloat(e.target.value) || undefined })} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm">Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Função</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="text-xs">Custo/Evento</TableHead>
                  <TableHead className="text-xs w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipe.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.funcao ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{e.telefone ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(e.custo_por_evento)}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteMut.mutate(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {equipe.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-sm">Nenhum membro cadastrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
