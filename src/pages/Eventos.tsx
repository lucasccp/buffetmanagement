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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatDate, formatCurrency, eventoStatusLabels } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  planejado: "bg-info/10 text-info border-info/20",
  confirmado: "bg-warning/10 text-warning border-warning/20",
  realizado: "bg-success/10 text-success border-success/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Eventos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"eventos">>>({});

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: TablesInsert<"eventos">) => {
      const { error } = await supabase.from("eventos").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); setOpen(false); setForm({}); toast.success("Evento criado!"); },
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
              <form onSubmit={(e) => { e.preventDefault(); if (form.nome_evento) createMut.mutate(form as TablesInsert<"eventos">); }} className="space-y-3">
                <div><Label className="text-xs">Nome do Evento *</Label><Input value={form.nome_evento ?? ""} onChange={(e) => setForm({ ...form, nome_evento: e.target.value })} required className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Data</Label><Input type="date" value={form.data_evento ?? ""} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} className="mt-1" /></div>
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
                {eventos.map((ev) => (
                  <TableRow key={ev.id} className="cursor-pointer" onClick={() => navigate(`/eventos/${ev.id}`)}>
                    <TableCell className="font-medium text-sm">{ev.nome_evento}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ev.data_evento)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{ev.numero_convidados ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{ev.local ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(ev.valor_total)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[ev.status]}>{eventoStatusLabels[ev.status]}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${ev.id}`); }}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
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
