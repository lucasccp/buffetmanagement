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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { formatCurrency, formatDate, eventoStatusLabels, custoCategLabels, pagamentoEventoStatusLabels, metodoPagamentoLabels } from "@/lib/formatters";
import { Plus, Trash2 } from "lucide-react";

export default function EventoDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

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

  if (!evento) return <AppLayout><div className="text-muted-foreground">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">{evento.nome_evento}</h1>
          <p className="text-muted-foreground">{formatDate(evento.data_evento)} · {evento.local ?? "Sem local"}</p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">Custos</div>
            <div className="text-lg font-bold text-destructive">{formatCurrency(custoTotal)}</div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">Recebido</div>
            <div className="text-lg font-bold text-success">{formatCurrency(pagamentoTotal)}</div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">Lucro</div>
            <div className={`text-lg font-bold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucro)}</div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="cardapio">Cardápio</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="geral"><GeralTab evento={evento} onUpdate={(v) => updateEvento.mutate(v)} /></TabsContent>
        <TabsContent value="equipe"><EquipeTab eventoId={id!} /></TabsContent>
        <TabsContent value="custos"><CustosTab eventoId={id!} /></TabsContent>
        <TabsContent value="cardapio"><CardapioTab eventoId={id!} /></TabsContent>
        <TabsContent value="faturamento"><FaturamentoTab eventoId={id!} /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function GeralTab({ evento, onUpdate }: { evento: any; onUpdate: (v: any) => void }) {
  const [form, setForm] = useState(evento);
  const handleSave = () => {
    onUpdate({
      nome_evento: form.nome_evento,
      tipo_evento: form.tipo_evento,
      data_evento: form.data_evento,
      horario_inicio: form.horario_inicio,
      horario_fim: form.horario_fim,
      numero_convidados: form.numero_convidados,
      local: form.local,
      valor_total: form.valor_total,
      status: form.status,
      observacoes: form.observacoes,
    });
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-4">
        <div><Label>Nome do Evento</Label><Input value={form.nome_evento} onChange={(e) => setForm({ ...form, nome_evento: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Tipo</Label><Input value={form.tipo_evento ?? ""} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.data_evento ?? ""} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Horário Início</Label><Input type="time" value={form.horario_inicio ?? ""} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} /></div>
          <div><Label>Horário Fim</Label><Input type="time" value={form.horario_fim ?? ""} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Convidados</Label><Input type="number" value={form.numero_convidados ?? ""} onChange={(e) => setForm({ ...form, numero_convidados: parseInt(e.target.value) || null })} /></div>
          <div><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valor_total ?? ""} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) || null })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.evento_status.map((s) => (
                  <SelectItem key={s} value={s}>{eventoStatusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Local</Label><Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
        <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </CardContent>
    </Card>
  );
}

function EquipeTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [equipeId, setEquipeId] = useState("");
  const [valorPago, setValorPago] = useState("");

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
      const { error } = await supabase.from("evento_equipe").insert({
        evento_id: eventoId,
        equipe_id: equipeId,
        valor_pago: parseFloat(valorPago) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_equipe", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      setEquipeId(""); setValorPago("");
      toast.success("Membro adicionado!");
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

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Equipe do Evento</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Select value={equipeId} onValueChange={setEquipeId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {equipeList.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome} - {e.funcao}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Valor pago" type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} className="w-32" />
          <Button onClick={() => addMut.mutate()} disabled={!equipeId}><Plus className="h-4 w-4" /></Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Função</TableHead><TableHead>Valor Pago</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {eventoEquipe.map((ee: any) => (
              <TableRow key={ee.id}>
                <TableCell>{ee.equipe?.nome}</TableCell>
                <TableCell>{ee.equipe?.funcao}</TableCell>
                <TableCell>{formatCurrency(ee.valor_pago)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => removeMut.mutate(ee.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustosTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<TablesInsert<"custos_evento">>>({});

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
        evento_id: eventoId,
        descricao: form.descricao!,
        categoria: form.categoria!,
        valor: form.valor!,
        data_custo: form.data_custo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos_evento", eventoId] });
      qc.invalidateQueries({ queryKey: ["custo_total", eventoId] });
      setForm({});
      toast.success("Custo adicionado!");
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

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Custos do Evento</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Descrição" value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-48" />
          <Select value={form.categoria ?? ""} onValueChange={(v) => setForm({ ...form, categoria: v as any })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.custo_categoria.map((c) => <SelectItem key={c} value={c}>{custoCategLabels[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Valor" type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) })} className="w-28" />
          <Input type="date" value={form.data_custo ?? ""} onChange={(e) => setForm({ ...form, data_custo: e.target.value })} className="w-40" />
          <Button onClick={() => addMut.mutate()} disabled={!form.descricao || !form.categoria || !form.valor}><Plus className="h-4 w-4" /></Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {custos.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.descricao}</TableCell>
                <TableCell><Badge variant="outline">{custoCategLabels[c.categoria]}</Badge></TableCell>
                <TableCell>{formatCurrency(c.valor)}</TableCell>
                <TableCell>{formatDate(c.data_custo)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => removeMut.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardapioTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
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
      const { error } = await supabase.from("evento_cardapio").insert({
        evento_id: eventoId,
        cardapio_id: cardapioId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_cardapio", eventoId] });
      setCardapioId("");
      toast.success("Cardápio vinculado!");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_cardapio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_cardapio", eventoId] });
    },
  });

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Cardápio do Evento</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Select value={cardapioId} onValueChange={setCardapioId}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecione um cardápio" /></SelectTrigger>
            <SelectContent>
              {cardapiosList.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome} - {formatCurrency(c.valor_sugerido_pp)}/pessoa</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => addMut.mutate()} disabled={!cardapioId}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          {eventoCardapios.map((ec: any) => (
            <div key={ec.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium">{ec.cardapios?.nome}</h4>
                  <p className="text-sm text-muted-foreground">{formatCurrency(ec.cardapios?.valor_sugerido_pp)}/pessoa</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeMut.mutate(ec.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ec.cardapios?.cardapio_itens?.map((i: any) => (
                  <Badge key={i.id} variant="outline">{i.nome}</Badge>
                ))}
              </div>
            </div>
          ))}
          {eventoCardapios.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum cardápio vinculado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FaturamentoTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<TablesInsert<"faturamento_evento">>>({});

  const { data: faturamentos = [] } = useQuery({
    queryKey: ["faturamento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturamento_evento").select("*").eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("faturamento_evento").insert({
        evento_id: eventoId,
        valor_total: form.valor_total!,
        valor_recebido: form.valor_recebido ?? 0,
        status_pagamento: form.status_pagamento ?? "pendente",
        data_pagamento: form.data_pagamento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["dashboard_metrics"] });
      setForm({});
      toast.success("Faturamento registrado!");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums<"pagamento_status"> }) => {
      const { error } = await supabase.from("faturamento_evento").update({ status_pagamento: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturamento", eventoId] });
      toast.success("Status atualizado!");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faturamento_evento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Faturamento do Evento</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Valor Total" type="number" step="0.01" value={form.valor_total ?? ""} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) })} className="w-36" />
          <Input placeholder="Valor Recebido" type="number" step="0.01" value={form.valor_recebido ?? ""} onChange={(e) => setForm({ ...form, valor_recebido: parseFloat(e.target.value) })} className="w-36" />
          <Select value={form.status_pagamento ?? "pendente"} onValueChange={(v) => setForm({ ...form, status_pagamento: v as any })}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.pagamento_status.map((s) => <SelectItem key={s} value={s}>{pagamentoStatusLabels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={form.data_pagamento ?? ""} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} className="w-40" />
          <Button onClick={() => addMut.mutate()} disabled={!form.valor_total}><Plus className="h-4 w-4" /></Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Valor Total</TableHead><TableHead>Recebido</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {faturamentos.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{formatCurrency(f.valor_total)}</TableCell>
                <TableCell>{formatCurrency(f.valor_recebido)}</TableCell>
                <TableCell>
                  <Select value={f.status_pagamento} onValueChange={(v) => updateStatus.mutate({ id: f.id, status: v as Enums<"pagamento_status"> })}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.pagamento_status.map((s) => <SelectItem key={s} value={s}>{pagamentoStatusLabels[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatDate(f.data_pagamento)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => removeMut.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
