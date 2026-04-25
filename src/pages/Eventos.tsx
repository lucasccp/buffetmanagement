import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, AlertTriangle, Search, ArrowUpDown, CalendarDays } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatDate, formatCurrency, eventoStatusLabels } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";

const statusColors: Record<string, string> = {
  planejado: "bg-info/10 text-info border-info/20",
  confirmado: "bg-warning/10 text-warning border-warning/20",
  realizado: "bg-success/10 text-success border-success/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

type SortKey = "nome_evento" | "data_evento" | "valor_total" | "status";
type SortDir = "asc" | "desc";

export default function Eventos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"eventos">>>({});
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data_evento");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: custosPorEvento = {} } = useQuery({
    queryKey: ["custos_por_evento"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custos_evento").select("evento_id, valor");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const c of data ?? []) {
        map[c.evento_id] = (map[c.evento_id] ?? 0) + Number(c.valor ?? 0);
      }
      return map;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: TablesInsert<"eventos">) => {
      const { error } = await supabase.from("eventos").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); setOpen(false); setForm({}); toast.success("Evento criado!"); },
  });

  function getInconsistencias(ev: typeof eventos[number]): string[] {
    const issues: string[] = [];
    if (!ev.data_evento) issues.push("Sem data definida");
    if (!ev.valor_total || Number(ev.valor_total) <= 0) issues.push("Sem valor total");
    const custo = custosPorEvento[ev.id] ?? 0;
    if (custo > 0 && Number(ev.valor_total ?? 0) > 0 && custo > Number(ev.valor_total)) {
      issues.push(`Custos (R$ ${custo.toFixed(2)}) excedem o faturamento`);
    }
    return issues;
  }

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); toast.success("Evento removido!"); },
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Eventos</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Evento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!form.nome_evento) return;
                if (!form.data_evento) { toast.error("A data do evento é obrigatória."); return; }
                if (form.status === "confirmado" && (!form.valor_total || Number(form.valor_total) <= 0)) {
                  toast.error("Para confirmar o evento, informe um valor total maior que zero.");
                  return;
                }
                createMut.mutate(form as TablesInsert<"eventos">);
              }} className="space-y-3">
                <div><Label className="text-xs">Nome do Evento *</Label><Input value={form.nome_evento ?? ""} onChange={(e) => setForm({ ...form, nome_evento: e.target.value })} required className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Data *</Label><Input type="date" required value={form.data_evento ?? ""} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Horário Início</Label><Input type="time" value={form.horario_inicio ?? ""} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Horário Fim</Label><Input type="time" value={form.horario_fim ?? ""} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: parseInt(e.target.value) || undefined })} className="mt-1" /></div>
                  <div><Label className="text-xs">Valor Total (R$)</Label><Input type="number" step="0.01" value={form.valor_total ?? ""} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) || undefined })} className="mt-1" /></div>
                </div>
                <div><Label className="text-xs">Local</Label><Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status ?? "planejado"} onValueChange={(v) => setForm({ ...form, status: v as Enums<"evento_status"> })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.evento_status.map((s) => (
                        <SelectItem key={s} value={s}>{eventoStatusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm">Criar Evento</Button>
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
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Convidados</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Local</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((ev) => {
                  const issues = getInconsistencias(ev);
                  return (
                  <TableRow key={ev.id} className="cursor-pointer" onClick={() => navigate(`/eventos/${ev.id}`)}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-1.5">
                        {issues.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-xs list-disc pl-4">
                                {issues.map((i, idx) => <li key={idx}>{i}</li>)}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span>{ev.nome_evento}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ev.data_evento)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{ev.numero_convidados ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{ev.local ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(ev.valor_total)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[ev.status]}>{eventoStatusLabels[ev.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${ev.id}`); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <DeleteConfirmDialog onConfirm={() => deleteMut.mutate(ev.id)} title="Excluir evento" description={`Tem certeza que deseja excluir "${ev.nome_evento}"? Todos os custos, pagamentos e equipe vinculados serão removidos.`} />
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {eventos.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">Nenhum evento encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
