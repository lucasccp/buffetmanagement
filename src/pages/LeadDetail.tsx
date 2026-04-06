import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useState } from "react";
import { formatCurrency, formatDate, leadStatusLabels } from "@/lib/formatters";
import { Sparkles, Copy, RefreshCw, ArrowRight, ArrowLeft, Pencil, Save } from "lucide-react";

const statusColors: Record<string, string> = {
  novo: "bg-info/10 text-info border-info/20",
  contato_realizado: "bg-warning/10 text-warning border-warning/20",
  proposta_enviada: "bg-primary/10 text-primary border-primary/20",
  fechado: "bg-success/10 text-success border-success/20",
  perdido: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingInfo, setEditingInfo] = useState(false);

  const { data: lead } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("*, cardapio_itens(nome)").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const updateLead = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase.from("leads").update(values).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Lead atualizado!");
      setEditingInfo(false);
    },
  });

  const convertToEvento = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("Lead não encontrado");
      const { data, error } = await supabase.from("eventos").insert({
        lead_id: lead.id,
        nome_evento: `Evento - ${lead.nome}`,
        tipo_evento: lead.tipo_evento,
        data_evento: lead.data_prevista,
        numero_convidados: lead.numero_convidados,
        valor_total: (lead as any).valor_evento,
        local: (lead as any).endereco,
        observacoes: lead.observacoes,
      }).select("id").single();
      if (error) throw error;

      // Link cardápio if exists
      const cardapioId = (lead as any).cardapio_id;
      if (cardapioId) {
        await supabase.from("evento_cardapio").insert({ evento_id: data.id, cardapio_id: cardapioId });
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

  if (!lead) return <AppLayout><div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div></AppLayout>;

  const leadAny = lead as any;
  const selectedCardapio = cardapios.find((c) => c.id === leadAny.cardapio_id);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}><ArrowLeft className="h-3.5 w-3.5 mr-1" />Leads</Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{lead.nome}</h1>
            <Badge variant="outline" className={statusColors[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
          </div>
          <Button size="sm" onClick={() => convertToEvento.mutate()} disabled={lead.status === "fechado" || lead.status === "perdido"}>
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />Converter em Evento
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Info Card */}
          <LeadInfoCard
            lead={lead}
            cardapios={cardapios}
            editing={editingInfo}
            onEdit={() => setEditingInfo(true)}
            onSave={(values) => updateLead.mutate(values)}
            onCancel={() => setEditingInfo(false)}
          />

          {/* Cardápio vinculado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cardápio Vinculado</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCardapio ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{selectedCardapio.nome}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(selectedCardapio.valor_sugerido_pp)}/pessoa</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedCardapio as any).cardapio_itens?.map((item: any) => (
                      <Badge key={item.nome} variant="secondary" className="text-xs">{item.nome}</Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum cardápio vinculado. Edite as informações para vincular.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Proposta com IA */}
        <PropostaTab leadId={id!} />
      </div>
    </AppLayout>
  );
}

// ─── LEAD INFO CARD ──────────────────────────────────────────
function LeadInfoCard({ lead, cardapios, editing, onEdit, onSave, onCancel }: {
  lead: any;
  cardapios: any[];
  editing: boolean;
  onEdit: () => void;
  onSave: (v: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});

  const startEdit = () => {
    setForm({
      nome: lead.nome,
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      tipo_evento: lead.tipo_evento ?? "",
      data_prevista: lead.data_prevista ?? "",
      numero_convidados: lead.numero_convidados ?? "",
      valor_evento: lead.valor_evento ?? "",
      endereco: lead.endereco ?? "",
      observacoes: lead.observacoes ?? "",
      cardapio_id: lead.cardapio_id ?? "",
      status: lead.status,
    });
    onEdit();
  };

  const handleSave = () => {
    onSave({
      ...form,
      numero_convidados: form.numero_convidados ? parseInt(form.numero_convidados) : null,
      valor_evento: form.valor_evento ? parseFloat(form.valor_evento) : null,
      cardapio_id: form.cardapio_id || null,
    });
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Informações</CardTitle>
          <Button size="sm" variant="ghost" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground text-xs">Telefone</span><p>{lead.telefone ?? "—"}</p></div>
          <div><span className="text-muted-foreground text-xs">Email</span><p>{lead.email ?? "—"}</p></div>
          <div><span className="text-muted-foreground text-xs">Tipo de Evento</span><p>{lead.tipo_evento ?? "—"}</p></div>
          <div><span className="text-muted-foreground text-xs">Data Prevista</span><p>{formatDate(lead.data_prevista)}</p></div>
          <div><span className="text-muted-foreground text-xs">Convidados</span><p>{lead.numero_convidados ?? "—"}</p></div>
          <div><span className="text-muted-foreground text-xs">Valor do Evento</span><p>{lead.valor_evento ? formatCurrency(lead.valor_evento) : "—"}</p></div>
          <div className="col-span-2"><span className="text-muted-foreground text-xs">Endereço</span><p>{lead.endereco ?? "—"}</p></div>
          <div className="col-span-2"><span className="text-muted-foreground text-xs">Observações</span><p>{lead.observacoes ?? "—"}</p></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Editar Informações</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Tipo de Evento</Label><Input value={form.tipo_evento} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Data Prevista</Label><Input type="date" value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Nº Convidados</Label><Input type="number" value={form.numero_convidados} onChange={(e) => setForm({ ...form, numero_convidados: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Valor do Evento</Label><Input type="number" step="0.01" value={form.valor_evento} onChange={(e) => setForm({ ...form, valor_evento: e.target.value })} className="mt-1" /></div>
        </div>
        <div><Label className="text-xs">Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1" /></div>
        <div>
          <Label className="text-xs">Cardápio</Label>
          <Select value={form.cardapio_id || "none"} onValueChange={(v) => setForm({ ...form, cardapio_id: v === "none" ? "" : v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cardápio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {cardapios.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome} — {formatCurrency(c.valor_sugerido_pp)}/pp</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.lead_status.map((s) => (
                <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1" /></div>
      </CardContent>
    </Card>
  );
}

// ─── PROPOSTA TAB ────────────────────────────────────────────
type PropostaData = {
  abertura: string;
  descricao_evento: string;
  cardapio: string;
  servicos: string;
  investimento: string;
  encerramento: string;
};

function PropostaTab({ leadId }: { leadId: string }) {
  const [tom, setTom] = useState("premium");
  const [proposta, setProposta] = useState<PropostaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const propostaToText = (p: PropostaData) =>
    [p.abertura, p.descricao_evento, p.cardapio, p.servicos, p.investimento, p.encerramento].join("\n\n---\n\n");

  const handleGenerate = async () => {
    setLoading(true);
    setProposta(null);
    setEditing(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposta", {
        body: { lead_id: leadId, tom },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProposta(data.proposta);
      setEditText(propostaToText(data.proposta));
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar proposta");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = editing ? editText : proposta ? propostaToText(proposta) : "";
    await navigator.clipboard.writeText(text);
    toast.success("Proposta copiada!");
  };

  const handleEdit = () => {
    if (proposta) setEditText(propostaToText(proposta));
    setEditing(true);
  };

  const sectionLabels: Record<keyof PropostaData, string> = {
    abertura: "Abertura",
    descricao_evento: "Descrição do Evento",
    cardapio: "Cardápio",
    servicos: "Serviços Inclusos",
    investimento: "Investimento",
    encerramento: "Encerramento",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Proposta Comercial com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tom da proposta</Label>
          <RadioGroup value={tom} onValueChange={setTom} className="flex gap-4">
            {[
              { value: "premium", label: "Premium" },
              { value: "simples", label: "Simples" },
              { value: "direto", label: "Direto" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center space-x-1.5">
                <RadioGroupItem value={opt.value} id={`tom-${opt.value}`} />
                <Label htmlFor={`tom-${opt.value}`} className="text-xs cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Gerando...</>
            ) : proposta ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Regenerar</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Gerar Proposta com IA</>
            )}
          </Button>
          {proposta && !loading && (
            <>
              <Button size="sm" variant="outline" onClick={handleEdit} disabled={editing} className="text-xs">
                <Pencil className="h-3.5 w-3.5 mr-1" />Editar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs">
                <Copy className="h-3.5 w-3.5 mr-1" />Copiar
              </Button>
            </>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="text-sm">Gerando proposta personalizada...</p>
            </div>
          </div>
        )}

        {!loading && editing && (
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={20} className="text-sm font-mono" />
        )}

        {!loading && !editing && proposta && (
          <div className="space-y-4">
            {(Object.keys(sectionLabels) as (keyof PropostaData)[]).map((key) => (
              <div key={key} className="space-y-1">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">{sectionLabels[key]}</h3>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed rounded-md bg-muted/50 p-3">
                  {proposta[key]}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !proposta && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Clique em "Gerar Proposta com IA" para criar uma proposta personalizada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
