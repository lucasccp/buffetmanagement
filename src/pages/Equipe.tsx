import { useMemo, useState } from "react";
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
import { Plus, Search, UsersRound } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatCurrency } from "@/lib/formatters";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function Equipe() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"equipe">>>({});
  const [search, setSearch] = useState("");

  const { data: equipe = [], isLoading } = useQuery({
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return equipe;
    return equipe.filter((m) =>
      m.nome?.toLowerCase().includes(term) ||
      m.funcao?.toLowerCase().includes(term) ||
      m.telefone?.toLowerCase().includes(term)
    );
  }, [equipe, search]);

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
                <div><Label className="text-xs">Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="mt-1" autoFocus /></div>
                <div><Label className="text-xs">Função</Label><Input value={form.funcao ?? ""} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Custo por Evento</Label><Input type="number" step="0.01" value={form.custo_por_evento ?? ""} onChange={(e) => setForm({ ...form, custo_por_evento: parseFloat(e.target.value) || undefined })} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm">Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, função ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          {search && (
            <span className="text-xs text-muted-foreground">{filtered.length} de {equipe.length}</span>
          )}
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
                {isLoading ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      {equipe.length === 0 ? (
                        <EmptyState
                          icon={UsersRound}
                          title="Nenhum membro cadastrado"
                          description="Cadastre os profissionais que atuam nos seus eventos."
                          actionLabel="Cadastrar primeiro membro"
                          onAction={() => setOpen(true)}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-12 text-sm">
                          Nenhum membro encontrado para "{search}"
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.funcao ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{e.telefone ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(e.custo_por_evento)}</TableCell>
                      <TableCell><DeleteConfirmDialog onConfirm={() => deleteMut.mutate(e.id)} title="Excluir membro" description={`Tem certeza que deseja excluir "${e.nome}"? Esta ação não pode ser desfeita.`} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
