import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, Enums } from "@/integrations/supabase/types";
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
import { Plus, ArrowRight } from "lucide-react";
import { formatDate, leadStatusLabels } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  novo: "bg-info text-info-foreground",
  contato_realizado: "bg-warning text-warning-foreground",
  proposta_enviada: "bg-primary text-primary-foreground",
  fechado: "bg-success text-success-foreground",
  perdido: "bg-destructive text-destructive-foreground",
};

export default function Leads() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"leads">>>({});

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: TablesInsert<"leads">) => {
      const { error } = await supabase.from("leads").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setOpen(false); setForm({}); toast.success("Lead criado!"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums<"lead_status"> }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success("Status atualizado!"); },
  });

  const convertToEvento = useMutation({
    mutationFn: async (lead: Tables<"leads">) => {
      const { data, error } = await supabase.from("eventos").insert({
        lead_id: lead.id,
        nome_evento: `Evento - ${lead.nome}`,
        tipo_evento: lead.tipo_evento,
        data_evento: lead.data_prevista,
        numero_convidados: lead.numero_convidados,
        observacoes: lead.observacoes,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("leads").update({ status: "fechado" as Enums<"lead_status"> }).eq("id", lead.id);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead convertido em evento!");
      navigate(`/eventos/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    createMut.mutate(form as TablesInsert<"leads">);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Leads</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipo de Evento</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} /></div>
                <div><Label>Data Prevista</Label><Input type="date" value={form.data_prevista ?? ""} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} /></div>
              </div>
              <div><Label>Nº Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: parseInt(e.target.value) || undefined })} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <Button type="submit" className="w-full">Criar Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tipo Evento</TableHead>
              <TableHead>Data Prevista</TableHead>
              <TableHead>Convidados</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.nome}</TableCell>
                <TableCell>{lead.telefone ?? "—"}</TableCell>
                <TableCell>{lead.tipo_evento ?? "—"}</TableCell>
                <TableCell>{formatDate(lead.data_prevista)}</TableCell>
                <TableCell>{lead.numero_convidados ?? "—"}</TableCell>
                <TableCell>
                  <Select value={lead.status} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v as Enums<"lead_status"> })}>
                    <SelectTrigger className="w-[160px]">
                      <Badge className={statusColors[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.lead_status.map((s) => (
                        <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => convertToEvento.mutate(lead)} disabled={lead.status === "fechado" || lead.status === "perdido"}>
                    <ArrowRight className="h-4 w-4 mr-1" />Converter
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lead encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card rounded-lg border shadow-sm overflow-hidden">{children}</div>;
}
