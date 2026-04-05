import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { formatCurrency, formatDate, eventoStatusLabels, custoCategLabels, pagamentoEventoStatusLabels, metodoPagamentoLabels } from "@/lib/formatters";
import { Plus, Pencil, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { parcelaStatusLabels } from "@/lib/formatters";
import { useRole } from "@/hooks/use-role";

export default function EventoDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { isAdmin } = useRole();

  const { data: evento } = useQuery({
    queryKey: ["evento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: custoTotal } = useQuery({
    queryKey: ["custo_total", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calcular_custos_evento", { p_evento_id: id! });
      if (error) throw error;
      return data as number;
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos_evento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos_evento").select("*").eq("evento_id", id!).order("data_planejada");
      if (error) throw error;
      return data;
    },
  });

  const pagamentoTotal = pagamentos?.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0) ?? 0;
  const lucro = pagamentoTotal - (custoTotal ?? 0);

  const updateEvento = useMutation({
    mutationFn: async (values: Partial<TablesInsert<"eventos">>) => {
      const { error } = await supabase.from("eventos").update(values).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["evento", id] }); toast.success("Evento atualizado!"); },
  });

  if (!evento) return <AppLayout><div className="text-muted-foreground p-8">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{evento.nome_evento}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(evento.data_evento)} · {evento.local ?? "Sem local"}</p>
          </div>
          <div className="flex gap-3">
            <Card className="border shadow-none px-3 py-2">
              <div className="text-[10px] text-muted-foreground font-medium">Custos</div>
              <div className="text-base font-semibold text-destructive">{formatCurrency(custoTotal)}</div>
            </Card>
            <Card className="border shadow-none px-3 py-2">
              <div className="text-[10px] text-muted-foreground font-medium">Recebido</div>
              <div className="text-base font-semibold text-success">{formatCurrency(pagamentoTotal)}</div>
            </Card>
            <Card className="border shadow-none px-3 py-2">
              <div className="text-[10px] text-muted-foreground font-medium">Lucro</div>
              <div className={`text-base font-semibold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucro)}</div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="geral">
          <TabsList className="flex-wrap">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="custos">Custos</TabsTrigger>
            <TabsTrigger value="cardapio">Cardápio</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral"><GeralTab evento={evento} onUpdate={(v) => updateEvento.mutate(v)} /></TabsContent>
          <TabsContent value="equipe"><EquipeTab eventoId={id!} /></TabsContent>
          <TabsContent value="custos"><CustosTab eventoId={id!} /></TabsContent>
          <TabsContent value="cardapio"><CardapioTab eventoId={id!} /></TabsContent>
          <TabsContent value="pagamentos"><PagamentosTab eventoId={id!} evento={evento} isAdmin={isAdmin} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function GeralTab({ evento, onUpdate }: { evento: any; onUpdate: (v: any) => void }) {
  const [form, setForm] = useState(evento);
  const handleSave = () => {
    onUpdate({
      nome_evento: form.nome_evento, tipo_evento: form.tipo_evento, data_evento: form.data_evento,
      horario_inicio: form.horario_inicio, horario_fim: form.horario_fim, numero_convidados: form.numero_convidados,
      local: form.local, valor_total: form.valor_total, status: form.status, observacoes: form.observacoes,
    });
  };

  return (
    <Card className="mt-4 border shadow-none">
      <CardContent className="pt-6 space-y-3">
        <div><Label className="text-xs">Nome do Evento</Label><Input value={form.nome_evento} onChange={(e) => setForm({ ...form, nome_evento: e.target.value })} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Tipo</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Data</Label><Input type="date" value={form.data_evento ?? ""} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Horário Início</Label><Input type="time" value={form.horario_inicio ?? ""} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Horário Fim</Label><Input type="time" value={form.horario_fim ?? ""} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: parseInt(e.target.value) || null })} className="mt-1" /></div>
          <div><Label className="text-xs">Valor Total</Label><Input type="number" step="0.01" value={form.valor_total ?? ""} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) || null })} className="mt-1" /></div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{Constants.public.Enums.evento_status.map((s) => <SelectItem key={s} value={s}>{eventoStatusLabels[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label className="text-xs">Local</Label><Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} className="mt-1" /></div>
        <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1" /></div>
        <Button onClick={handleSave} size="sm">Salvar Alterações</Button>
      </CardContent>
    </Card>
  );
}

// ─── EQUIPE TAB ────────────────────────────────────────────
function EquipeTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [equipeId, setEquipeId] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [editValor, setEditValor] = useState("");

  const { data: eventoEquipe = [] } = useQuery({
    queryKey: ["evento_equipe", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("evento_equipe").select("*, equipe(*)").eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: equipeList = [] } = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_equipe").insert({ evento_id: eventoId, equipe_id: equipeId, valor_pago: parseFloat(valorPago) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_equipe", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      setEquipeId(""); setValorPago(""); setOpen(false);
      toast.success("Membro adicionado!");
    },
  });

  const editMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_equipe").update({ valor_pago: parseFloat(editValor) || 0 }).eq("id", editItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_equipe", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      setEditItem(null);
      toast.success("Membro atualizado!");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_equipe").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_equipe", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
    },
  });

  const openEdit = (ee: any) => {
    setEditItem(ee);
    setEditValor(String(ee.valor_pago ?? 0));
  };

  return (
    <Card className="mt-4 border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Equipe do Evento
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Membro à Equipe</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-3">
                <div>
                  <Label className="text-xs">Membro *</Label>
                  <Select value={equipeId} onValueChange={setEquipeId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                    <SelectContent>{equipeList.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome} - {e.funcao}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Valor Pago</Label><Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm" disabled={!equipeId}>Adicionar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-xs">Nome</TableHead><TableHead className="text-xs">Função</TableHead><TableHead className="text-xs">Valor Pago</TableHead><TableHead className="text-xs w-[80px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {eventoEquipe.map((ee: any) => (
              <TableRow key={ee.id}>
                <TableCell className="text-sm">{ee.equipe?.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ee.equipe?.funcao}</TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(ee.valor_pago)}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(ee)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <DeleteConfirmDialog onConfirm={() => removeMut.mutate(ee.id)} title="Remover membro" description={`Remover "${ee.equipe?.nome}" do evento?`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {eventoEquipe.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">Nenhum membro na equipe</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Membro</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }} className="space-y-3">
              <div><Label className="text-xs">Membro</Label><Input value={editItem.equipe?.nome ?? ""} disabled className="mt-1" /></div>
              <div><Label className="text-xs">Valor Pago</Label><Input type="number" step="0.01" value={editValor} onChange={(e) => setEditValor(e.target.value)} className="mt-1" /></div>
              <Button type="submit" className="w-full" size="sm">Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── CUSTOS TAB ────────────────────────────────────────────
function CustosTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TablesInsert<"custos_evento">>>({});
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: custos = [] } = useQuery({
    queryKey: ["custos_evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("custos_evento").select("*").eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("custos_evento").insert({
        evento_id: eventoId, descricao: form.descricao!, categoria: form.categoria!, valor: form.valor!, data_custo: form.data_custo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      setForm({}); setOpen(false);
      toast.success("Custo adicionado!");
    },
  });

  const editMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("custos_evento").update({
        descricao: editForm.descricao, categoria: editForm.categoria, valor: editForm.valor, data_custo: editForm.data_custo,
      }).eq("id", editItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      setEditItem(null);
      toast.success("Custo atualizado!");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos_evento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
    },
  });

  const openEdit = (c: any) => {
    setEditItem(c);
    setEditForm({ descricao: c.descricao, categoria: c.categoria, valor: c.valor, data_custo: c.data_custo ?? "" });
  };

  return (
    <Card className="mt-4 border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Custos do Evento
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Custo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Custo</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-3">
                <div><Label className="text-xs">Descrição *</Label><Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Categoria *</Label>
                  <Select value={form.categoria ?? ""} onValueChange={(v) => setForm({ ...form, categoria: v as any })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Constants.public.Enums.custo_categoria.map((c) => <SelectItem key={c} value={c}>{custoCategLabels[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) })} required className="mt-1" /></div>
                <div><Label className="text-xs">Data</Label><Input type="date" value={form.data_custo ?? ""} onChange={(e) => setForm({ ...form, data_custo: e.target.value })} className="mt-1" /></div>
                <Button type="submit" className="w-full" size="sm" disabled={!form.descricao || !form.categoria || !form.valor}>Adicionar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-xs">Descrição</TableHead><TableHead className="text-xs">Categoria</TableHead><TableHead className="text-xs">Valor</TableHead><TableHead className="text-xs hidden md:table-cell">Data</TableHead><TableHead className="text-xs w-[80px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {custos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">{c.descricao}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs font-normal">{custoCategLabels[c.categoria]}</Badge></TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(c.valor)}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(c.data_custo)}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <DeleteConfirmDialog onConfirm={() => removeMut.mutate(c.id)} title="Excluir custo" description={`Excluir "${c.descricao}"?`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {custos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">Nenhum custo registrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Custo</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }} className="space-y-3">
              <div><Label className="text-xs">Descrição *</Label><Input value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} required className="mt-1" /></div>
              <div>
                <Label className="text-xs">Categoria *</Label>
                <Select value={editForm.categoria} onValueChange={(v) => setEditForm({ ...editForm, categoria: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Constants.public.Enums.custo_categoria.map((c) => <SelectItem key={c} value={c}>{custoCategLabels[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: parseFloat(e.target.value) })} required className="mt-1" /></div>
              <div><Label className="text-xs">Data</Label><Input type="date" value={editForm.data_custo} onChange={(e) => setEditForm({ ...editForm, data_custo: e.target.value })} className="mt-1" /></div>
              <Button type="submit" className="w-full" size="sm">Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── CARDÁPIO TAB ────────────────────────────────────────────
function CardapioTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cardapioId, setCardapioId] = useState("");

  const { data: eventoCardapios = [] } = useQuery({
    queryKey: ["evento_cardapio", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("evento_cardapio").select("*, cardapios(*, cardapio_itens(*))").eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: cardapiosList = [] } = useQuery({
    queryKey: ["cardapios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_cardapio").insert({ evento_id: eventoId, cardapio_id: cardapioId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["evento_cardapio", eventoId] }); setCardapioId(""); setOpen(false); toast.success("Cardápio vinculado!"); },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_cardapio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["evento_cardapio", eventoId] }); },
  });

  return (
    <Card className="mt-4 border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Cardápio do Evento
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Vincular</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Vincular Cardápio</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-3">
                <div>
                  <Label className="text-xs">Cardápio *</Label>
                  <Select value={cardapioId} onValueChange={setCardapioId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cardápio" /></SelectTrigger>
                    <SelectContent>{cardapiosList.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} - {formatCurrency(c.valor_sugerido_pp)}/pessoa</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" size="sm" disabled={!cardapioId}>Vincular</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {eventoCardapios.map((ec: any) => (
            <div key={ec.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium">{ec.cardapios?.nome}</h4>
                  <p className="text-xs text-muted-foreground">{formatCurrency(ec.cardapios?.valor_sugerido_pp)}/pessoa</p>
                </div>
                <DeleteConfirmDialog onConfirm={() => removeMut.mutate(ec.id)} title="Desvincular cardápio" description={`Remover "${ec.cardapios?.nome}" do evento?`} />
              </div>
              <div className="flex flex-wrap gap-1">
                {ec.cardapios?.cardapio_itens?.map((i: any) => <Badge key={i.id} variant="outline" className="text-xs font-normal">{i.nome}</Badge>)}
              </div>
            </div>
          ))}
          {eventoCardapios.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhum cardápio vinculado</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PAGAMENTOS TAB ────────────────────────────────────────────

const parcelaStatusConfig: Record<string, { class: string; icon: typeof Clock }> = {
  pendente: { class: "bg-muted text-muted-foreground", icon: Clock },
  pago: { class: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  atrasado: { class: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

function PagamentosTab({ eventoId, evento, isAdmin }: { eventoId: string; evento: any; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [dataPlanejada, setDataPlanejada] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [metodo, setMetodo] = useState("pix");
  const [status, setStatus] = useState<"planejado" | "pago">("planejado");

  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Parcelas state
  const [openGerar, setOpenGerar] = useState(false);
  const [numParcelas, setNumParcelas] = useState("1");
  const [valorTotalParcelas, setValorTotalParcelas] = useState("");
  const [dataInicial, setDataInicial] = useState("");

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos_evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos_evento").select("*").eq("evento_id", eventoId).order("data_planejada");
      if (error) throw error;
      return data;
    },
  });

  // Parcelas queries
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas_pagamento", eventoId],
    queryFn: async () => {
      await supabase.rpc("atualizar_parcelas_atrasadas");
      const { data, error } = await supabase.from("parcelas_pagamento").select("*").eq("evento_id", eventoId).order("numero_parcela");
      if (error) throw error;
      return data;
    },
  });

  const { data: resumoParcelas } = useQuery({
    queryKey: ["parcelas_resumo", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_parcelas_resumo", { p_evento_id: eventoId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const totalPago = pagamentos.filter(p => p.status === "pago").reduce((s, p) => s + p.valor, 0);
  const totalPlanejado = pagamentos.reduce((s, p) => s + p.valor, 0);

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pagamentos_evento").insert({
        evento_id: eventoId, valor: parseFloat(valor), data_planejada: dataPlanejada,
        data_pagamento: dataPagamento || null, metodo_pagamento: metodo as any, status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagamentos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      setValor(""); setDataPlanejada(""); setDataPagamento(""); setMetodo("pix"); setStatus("planejado"); setOpen(false);
      toast.success("Pagamento registrado!");
    },
  });

  const editMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pagamentos_evento").update({
        valor: editForm.valor, data_planejada: editForm.data_planejada,
        data_pagamento: editForm.data_pagamento || null, metodo_pagamento: editForm.metodo_pagamento, status: editForm.status,
      }).eq("id", editItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagamentos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      setEditItem(null);
      toast.success("Pagamento atualizado!");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "planejado" | "pago" }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === "pago" && !pagamentos.find(p => p.id === id)?.data_pagamento) {
        updateData.data_pagamento = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase.from("pagamentos_evento").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagamentos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      toast.success("Status atualizado!");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagamentos_evento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagamentos_evento", eventoId] }); },
  });

  // Parcelas mutations
  const gerarMut = useMutation({
    mutationFn: async () => {
      const rawValor = valorTotalParcelas || String(evento?.valor_total ?? "");
      const vt = parseFloat(rawValor);
      const np = parseInt(numParcelas);
      if (!vt || !np || !dataInicial) throw new Error("Preencha todos os campos");
      const { error } = await supabase.rpc("gerar_parcelas", {
        p_evento_id: eventoId, p_valor_total: vt, p_num_parcelas: np, p_data_inicial: dataInicial,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      setOpenGerar(false);
      toast.success("Parcelas geradas com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar parcelas"),
  });

  const pagarParcelaMut = useMutation({
    mutationFn: async (parcelaId: string) => {
      const { error } = await supabase
        .from("parcelas_pagamento")
        .update({ status: "pago" as any, data_pagamento: new Date().toISOString().split("T")[0] })
        .eq("id", parcelaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      qc.invalidateQueries({ queryKey: ["pagamentos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      toast.success("Parcela marcada como paga!");
    },
  });

  const deletarTodasParcelasMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parcelas_pagamento").delete().eq("evento_id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      toast.success("Parcelas removidas!");
    },
  });

  const openEdit = (p: any) => {
    setEditItem(p);
    setEditForm({
      valor: p.valor, data_planejada: p.data_planejada, data_pagamento: p.data_pagamento ?? "",
      metodo_pagamento: p.metodo_pagamento, status: p.status,
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Pagamentos Section */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm font-medium">
            <span>Pagamentos</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-normal">Total: {formatCurrency(totalPlanejado)}</span>
              <span className="text-xs text-success font-normal">Recebido: {formatCurrency(totalPago)}</span>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-3">
                    <div><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required className="mt-1" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Data Planejada *</Label><Input type="date" value={dataPlanejada} onChange={(e) => setDataPlanejada(e.target.value)} required className="mt-1" /></div>
                      <div><Label className="text-xs">Data Pagamento</Label><Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className="mt-1" /></div>
                    </div>
                    <div>
                      <Label className="text-xs">Método</Label>
                      <Select value={metodo} onValueChange={setMetodo}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(metodoPagamentoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as "planejado" | "pago")}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(pagamentoEventoStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" size="sm" disabled={!valor || !dataPlanejada}>Registrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Planejada</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Pagamento</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Método</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.valor)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.data_planejada)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(p.data_pagamento)}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{metodoPagamentoLabels[p.metodo_pagamento] ?? p.metodo_pagamento}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus.mutate({ id: p.id, newStatus: v as "planejado" | "pago" })}>
                        <SelectTrigger className="w-[100px] h-7 text-xs border-0 p-0">
                          <Badge variant="outline" className={p.status === "pago" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                            {pagamentoEventoStatusLabels[p.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>{Object.entries(pagamentoEventoStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {isAdmin && <DeleteConfirmDialog onConfirm={() => removeMut.mutate(p.id)} title="Excluir pagamento" description={`Excluir pagamento de ${formatCurrency(p.valor)}?`} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pagamentos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Nenhum pagamento registrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Edit Modal */}
        <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Pagamento</DialogTitle></DialogHeader>
            {editItem && (
              <form onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }} className="space-y-3">
                <div><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: parseFloat(e.target.value) })} required className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Data Planejada *</Label><Input type="date" value={editForm.data_planejada} onChange={(e) => setEditForm({ ...editForm, data_planejada: e.target.value })} required className="mt-1" /></div>
                  <div><Label className="text-xs">Data Pagamento</Label><Input type="date" value={editForm.data_pagamento} onChange={(e) => setEditForm({ ...editForm, data_pagamento: e.target.value })} className="mt-1" /></div>
                </div>
                <div>
                  <Label className="text-xs">Método</Label>
                  <Select value={editForm.metodo_pagamento} onValueChange={(v) => setEditForm({ ...editForm, metodo_pagamento: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(metodoPagamentoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(pagamentoEventoStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" size="sm">Salvar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </Card>

      {/* Parcelas Section */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm font-medium">
            <span>Parcelas de Pagamento</span>
            <div className="flex items-center gap-2">
              {isAdmin && parcelas.length > 0 && (
                <DeleteConfirmDialog
                  onConfirm={() => deletarTodasParcelasMut.mutate()}
                  title="Excluir todas as parcelas"
                  description="Deseja excluir todas as parcelas deste evento? Isso não pode ser desfeito."
                />
              )}
              <Dialog open={openGerar} onOpenChange={setOpenGerar}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs" disabled={parcelas.length > 0}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Gerar Parcelas
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Gerar Parcelas</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); gerarMut.mutate(); }} className="space-y-3">
                    <div>
                      <Label className="text-xs">Valor Total *</Label>
                      <Input
                        type="number" step="0.01"
                        value={valorTotalParcelas || (evento?.valor_total ?? "")}
                        onChange={(e) => setValorTotalParcelas(e.target.value)}
                        required className="mt-1"
                        placeholder={evento?.valor_total ? `Sugestão: ${formatCurrency(evento.valor_total)}` : ""}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nº de Parcelas *</Label>
                        <Input type="number" min="1" max="48" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} required className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Data Inicial *</Label>
                        <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} required className="mt-1" />
                      </div>
                    </div>
                    {valorTotalParcelas && numParcelas && parseInt(numParcelas) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {numParcelas}x de {formatCurrency(parseFloat(valorTotalParcelas) / parseInt(numParcelas))}
                      </p>
                    )}
                    <Button type="submit" className="w-full" size="sm" disabled={gerarMut.isPending}>
                      {gerarMut.isPending ? "Gerando..." : "Gerar Parcelas"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          {resumoParcelas && (resumoParcelas as any).total_parcelas > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-[10px] text-muted-foreground font-medium">Total</div>
                <div className="text-sm font-semibold">{formatCurrency((resumoParcelas as any).total_valor)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] text-success font-medium">Recebido</div>
                <div className="text-sm font-semibold text-success">{formatCurrency((resumoParcelas as any).total_pago)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] text-muted-foreground font-medium">Pendente</div>
                <div className="text-sm font-semibold">{formatCurrency((resumoParcelas as any).total_pendente)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] text-destructive font-medium">Atrasado</div>
                <div className="text-sm font-semibold text-destructive">{formatCurrency((resumoParcelas as any).total_atrasado)}</div>
              </div>
            </div>
          )}

          {/* Parcelas Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Pagamento</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((p: any) => {
                  const cfg = parcelaStatusConfig[p.status] ?? parcelaStatusConfig.pendente;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-muted-foreground">{p.numero_parcela}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(p.valor)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(p.data_vencimento)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(p.data_pagamento)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.class}>
                          {parcelaStatusLabels[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status !== "pago" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs gap-1 text-success hover:text-success"
                            onClick={() => pagarParcelaMut.mutate(p.id)}
                            disabled={pagarParcelaMut.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {parcelas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma parcela gerada. Clique em "Gerar Parcelas" para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
