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
import { formatDate, formatCurrency, eventoStatusLabels } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  planejado: "bg-info text-info-foreground",
  confirmado: "bg-warning text-warning-foreground",
  realizado: "bg-success text-success-foreground",
  cancelado: "bg-destructive text-destructive-foreground",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_evento) return;
    createMut.mutate(form as TablesInsert<"eventos">);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Eventos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Evento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome do Evento *</Label><Input value={form.nome_evento ?? ""} onChange={(e) => setForm({ ...form, nome_evento: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipo de Evento</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="date" value={form.data_evento ?? ""} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Horário Início</Label><Input type="time" value={form.horario_inicio ?? ""} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} /></div>
                <div><Label>Horário Fim</Label><Input type="time" value={form.horario_fim ?? ""} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nº Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: parseInt(e.target.value) || undefined })} /></div>
                <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" value={form.valor_total ?? ""} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) || undefined })} /></div>
              </div>
              <div><Label>Local</Label><Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status ?? "planejado"} onValueChange={(v) => setForm({ ...form, status: v as Enums<"evento_status"> })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.evento_status.map((s) => (
                      <SelectItem key={s} value={s}>{eventoStatusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <Button type="submit" className="w-full">Criar Evento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Convidados</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.map((ev) => (
              <TableRow key={ev.id} className="cursor-pointer" onClick={() => navigate(`/eventos/${ev.id}`)}>
                <TableCell className="font-medium">{ev.nome_evento}</TableCell>
                <TableCell>{formatDate(ev.data_evento)}</TableCell>
                <TableCell>{ev.numero_convidados ?? "—"}</TableCell>
                <TableCell>{ev.local ?? "—"}</TableCell>
                <TableCell>{formatCurrency(ev.valor_total)}</TableCell>
                <TableCell><Badge className={statusColors[ev.status]}>{eventoStatusLabels[ev.status]}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${ev.id}`); }}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {eventos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum evento encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
