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
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatDate, formatCurrency, leadStatusLabels } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  novo: "bg-info/10 text-info border-info/20",
  contato_realizado: "bg-warning/10 text-warning border-warning/20",
  proposta_enviada: "bg-primary/10 text-primary border-primary/20",
  fechado: "bg-success/10 text-success border-success/20",
  perdido: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Leads() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("id, nome, valor_sugerido_pp").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase.from("leads").insert({
        nome: values.nome,
        telefone: values.telefone || null,
        email: values.email || null,
        tipo_evento: values.tipo_evento || null,
        data_prevista: values.data_prevista || null,
        numero_convidados: values.numero_convidados ? parseInt(values.numero_convidados) : null,
        observacoes: values.observacoes || null,
        valor_evento: values.valor_evento ? parseFloat(values.valor_evento) : null,
        endereco: values.endereco || null,
        cardapio_id: values.cardapio_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setOpen(false); setForm({}); toast.success("Lead criado!"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success("Lead removido!"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums<"lead_status"> }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success("Status atualizado!"); },
  });

  const convertToEvento = useMutation({
    mutationFn: async (lead: any) => {
      const { data, error } = await supabase.from("eventos").insert({
        lead_id: lead.id,
        nome_evento: `Evento - ${lead.nome}`,
        tipo_evento: lead.tipo_evento,
        data_evento: lead.data_prevista,
        numero_convidados: lead.numero_convidados,
        valor_total: lead.valor_evento,
        local: lead.endereco,
        observacoes: lead.observacoes,
      }).select("id").single();
      if (error) throw error;
      if (lead.cardapio_id) {
        await supabase.from("evento_cardapio").insert({ evento_id: data.id, cardapio_id: lead.cardapio_id });
      }
      await supabase.from("leads").update({ status: "fechado" as Enums<"lead_status"> }).eq("id", lead.id);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead convertido em evento!");
      navigate(`/eventos/${data.id}`);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (form.nome) createMut.mutate(form); }} className="space-y-3">
                <div><Label className="text-xs">Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo de Evento</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Data Prevista</Label><Input type="date" value={form.data_prevista ?? ""} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nº Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Valor do Evento</Label><Input type="number" step="0.01" value={form.valor_evento ?? ""} onChange={(e) => setForm({ ...form, valor_evento: e.target.value })} className="mt-1" /></div>
                </div>
                <div><Label className="text-xs">Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Cardápio</Label>
                  <Select value={form.cardapio_id ?? "none"} onValueChange={(v) => setForm({ ...form, cardapio_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cardápio" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {cardapios.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} — {formatCurrency(c.valor_sugerido_pp)}/pp</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm">Criar Lead</Button>
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
                  <TableHead className="text-xs">Telefone</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Tipo Evento</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Data Prevista</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Convidados</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <TableCell className="font-medium text-sm">{lead.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.telefone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{lead.tipo_evento ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(lead.data_prevista)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{lead.numero_convidados ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={lead.status} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v as Enums<"lead_status"> })}>
                        <SelectTrigger className="w-[120px] h-7 text-xs border-0 p-0">
                          <Badge variant="outline" className={statusColors[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Constants.public.Enums.lead_status.map((s) => (
                            <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => convertToEvento.mutate(lead)} disabled={lead.status === "fechado" || lead.status === "perdido"}>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteConfirmDialog onConfirm={() => deleteMut.mutate(lead.id)} title="Excluir lead" description={`Tem certeza que deseja excluir "${lead.nome}"? Esta ação não pode ser desfeita.`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {leads.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">Nenhum lead encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
