import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sparkles, Download, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { generatePropostaPdf } from "@/lib/generatePropostaPdf";

type PropostaConteudo = {
  abertura: string;
  descricao_evento: string;
  cardapio: string;
  servicos: string;
  investimento: string;
  encerramento: string;
  observacoes_finais: string;
  forma_pagamento: string;
};

export default function PropostaNova() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedLeadId = searchParams.get("lead_id") ?? "";
  const [leadMode, setLeadMode] = useState<"existing" | "new">("existing");
  const [cardapioMode, setCardapioMode] = useState<"existing" | "new">("existing");
  const [leadId, setLeadId] = useState(preselectedLeadId);
  const [cardapioId, setCardapioId] = useState("");
  const [tom, setTom] = useState("premium");
  const [newLead, setNewLead] = useState<Record<string, any>>({});
  const [newCardapio, setNewCardapio] = useState<Record<string, any>>({ valor_sugerido_pp: "" });
  const [conteudo, setConteudo] = useState<PropostaConteudo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // If lead has a linked cardápio, preselect it
  useEffect(() => {
    if (!preselectedLeadId) return;
    (async () => {
      const { data } = await supabase.from("leads").select("cardapio_id").eq("id", preselectedLeadId).maybeSingle();
      if (data?.cardapio_id) setCardapioId(data.cardapio_id);
    })();
  }, [preselectedLeadId]);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, nome, telefone, email, tipo_evento, data_prevista, numero_convidados, valor_evento, endereco").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("id, nome, valor_sugerido_pp").order("nome");
      if (error) throw error;
      return data;
    },
  });

  async function handleGenerate() {
    let actualLeadId = leadId;
    let actualCardapioId = cardapioId;

    // Create new lead if needed
    if (leadMode === "new") {
      if (!newLead.nome) { toast.error("Informe o nome do lead"); return; }
      const { data, error } = await supabase.from("leads").insert({
        nome: newLead.nome,
        telefone: newLead.telefone || null,
        email: newLead.email || null,
        tipo_evento: newLead.tipo_evento || null,
        data_prevista: newLead.data_prevista || null,
        numero_convidados: newLead.numero_convidados ? parseInt(newLead.numero_convidados) : null,
        valor_evento: newLead.valor_evento ? parseFloat(newLead.valor_evento) : null,
        endereco: newLead.endereco || null,
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      actualLeadId = data.id;
    } else if (!actualLeadId) {
      toast.error("Selecione um lead"); return;
    }

    // Create new cardapio if needed
    if (cardapioMode === "new") {
      if (!newCardapio.nome) { toast.error("Informe o nome do cardápio"); return; }
      const { data, error } = await supabase.from("cardapios").insert({
        nome: newCardapio.nome,
        valor_sugerido_pp: parseFloat(newCardapio.valor_sugerido_pp) || 0,
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      actualCardapioId = data.id;
      // link lead → cardapio
      await supabase.from("leads").update({ cardapio_id: actualCardapioId }).eq("id", actualLeadId);
    } else if (actualCardapioId) {
      await supabase.from("leads").update({ cardapio_id: actualCardapioId }).eq("id", actualLeadId);
    }

    setLeadId(actualLeadId);
    setCardapioId(actualCardapioId);
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposta", {
        body: { lead_id: actualLeadId, tom },
      });
      if (error) throw error;
      setConteudo(data.proposta);
      toast.success("Proposta gerada!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar proposta");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!conteudo || !leadId) return;
    setSaving(true);
    try {
      // Fetch full data
      const [leadRes, cardapioRes, empresaRes] = await Promise.all([
        supabase.from("leads").select("*").eq("id", leadId).single(),
        cardapioId ? supabase.from("cardapios").select("*, cardapio_itens(nome)").eq("id", cardapioId).single() : Promise.resolve({ data: null, error: null } as any),
        supabase.from("empresa_config" as any).select("*").limit(1).maybeSingle(),
      ]);
      const lead = leadRes.data!;
      const cardapio = cardapioRes.data;
      const empresa = (empresaRes.data as any) ?? { nome: "Buffet" };

      const numConv = lead.numero_convidados ?? 0;
      const valorTotal = Number(lead.valor_evento ?? 0);
      const valorPP = numConv > 0 ? valorTotal / numConv : Number(cardapio?.valor_sugerido_pp ?? 0);

      const doc = await generatePropostaPdf({
        cliente: lead.nome,
        data_evento: lead.data_prevista,
        local_evento: lead.endereco ?? "A definir",
        numero_convidados: numConv,
        valor_por_pessoa: valorPP,
        valor_total: valorTotal,
        cardapio_nome: cardapio?.nome ?? "Serviço de buffet",
        cardapio_itens: (cardapio?.cardapio_itens ?? []).map((i: any) => i.nome),
        descricao_servico: [conteudo.abertura, conteudo.descricao_evento, conteudo.servicos].filter(Boolean).join("\n\n"),
        texto_cardapio: conteudo.cardapio,
        observacoes: conteudo.observacoes_finais ?? conteudo.encerramento ?? "",
        forma_pagamento: conteudo.forma_pagamento ?? empresa.forma_pagamento_padrao ?? "",
      }, {
        nome: empresa.nome ?? "Buffet",
        telefone: empresa.telefone ?? null,
        endereco: empresa.endereco ?? null,
        email: empresa.email ?? null,
        logo_url: empresa.logo_url ?? null,
        cor_destaque: empresa.cor_destaque ?? null,
      });

      // Insert proposta
      const { data: proposta, error: insErr } = await supabase.from("propostas" as any).insert({
        lead_id: leadId,
        cardapio_id: cardapioId || null,
        tom,
        conteudo,
        numero_convidados: numConv,
        valor_por_pessoa: valorPP,
        valor_total: valorTotal,
        forma_pagamento: conteudo.forma_pagamento,
        observacoes: conteudo.observacoes_finais,
        status: "enviada",
      }).select("id").single();
      if (insErr) throw insErr;
      const propostaId = (proposta as any).id;

      // Upload PDF
      const blob = doc.output("blob");
      const path = `${propostaId}.pdf`;
      const { error: upErr } = await supabase.storage.from("propostas").upload(path, blob, { upsert: true, contentType: "application/pdf" });
      if (!upErr) {
        const { data: signed } = await supabase.storage.from("propostas").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) await supabase.from("propostas" as any).update({ pdf_url: signed.signedUrl }).eq("id", propostaId);
      }

      // Local download
      doc.save(`proposta-${lead.nome}.pdf`);
      toast.success("Proposta salva!");
      navigate(`/propostas/${propostaId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar proposta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/propostas")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold tracking-tight">Nova Proposta</h1>
        </div>

        {!conteudo && (
          <Card>
            <CardContent className="p-5 space-y-5">
              {/* LEAD */}
              <div>
                <Label className="text-xs font-medium">1. Lead</Label>
                <Tabs value={leadMode} onValueChange={(v) => setLeadMode(v as any)} className="mt-2">
                  <TabsList><TabsTrigger value="existing">Existente</TabsTrigger><TabsTrigger value="new">Novo</TabsTrigger></TabsList>
                  <TabsContent value="existing" className="mt-3">
                    <Select value={leadId} onValueChange={setLeadId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                      <SelectContent>
                        {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  <TabsContent value="new" className="mt-3 space-y-3">
                    <Input placeholder="Nome *" value={newLead.nome ?? ""} onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Telefone" value={newLead.telefone ?? ""} onChange={(e) => setNewLead({ ...newLead, telefone: e.target.value })} />
                      <Input placeholder="Email" value={newLead.email ?? ""} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Tipo de evento" value={newLead.tipo_evento ?? ""} onChange={(e) => setNewLead({ ...newLead, tipo_evento: e.target.value })} />
                      <Input type="date" value={newLead.data_prevista ?? ""} onChange={(e) => setNewLead({ ...newLead, data_prevista: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Convidados" value={newLead.numero_convidados ?? ""} onChange={(e) => setNewLead({ ...newLead, numero_convidados: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Valor do evento" value={newLead.valor_evento ?? ""} onChange={(e) => setNewLead({ ...newLead, valor_evento: e.target.value })} />
                    </div>
                    <Input placeholder="Endereço do evento" value={newLead.endereco ?? ""} onChange={(e) => setNewLead({ ...newLead, endereco: e.target.value })} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* CARDAPIO */}
              <div>
                <Label className="text-xs font-medium">2. Cardápio</Label>
                <Tabs value={cardapioMode} onValueChange={(v) => setCardapioMode(v as any)} className="mt-2">
                  <TabsList><TabsTrigger value="existing">Existente</TabsTrigger><TabsTrigger value="new">Novo</TabsTrigger></TabsList>
                  <TabsContent value="existing" className="mt-3">
                    <Select value={cardapioId} onValueChange={setCardapioId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cardápio" /></SelectTrigger>
                      <SelectContent>
                        {cardapios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} — {formatCurrency(Number(c.valor_sugerido_pp))}/pp</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  <TabsContent value="new" className="mt-3 space-y-3">
                    <Input placeholder="Nome do cardápio *" value={newCardapio.nome ?? ""} onChange={(e) => setNewCardapio({ ...newCardapio, nome: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Valor por pessoa" value={newCardapio.valor_sugerido_pp ?? ""} onChange={(e) => setNewCardapio({ ...newCardapio, valor_sugerido_pp: e.target.value })} />
                    <p className="text-[11px] text-muted-foreground">Você poderá adicionar os itens do cardápio depois, na página de Cardápio.</p>
                  </TabsContent>
                </Tabs>
              </div>

              {/* TOM */}
              <div>
                <Label className="text-xs font-medium">3. Tom da proposta</Label>
                <Select value={tom} onValueChange={setTom}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium / Sofisticado</SelectItem>
                    <SelectItem value="simples">Simples / Amigável</SelectItem>
                    <SelectItem value="direto">Direto / Profissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-2">{generating ? "Gerando..." : "Gerar com IA"}</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {conteudo && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-medium">Pré-visualização (editável)</h2>
              {(Object.keys(conteudo) as Array<keyof PropostaConteudo>).map((key) => (
                <div key={key}>
                  <Label className="text-xs capitalize">{String(key).replace(/_/g, " ")}</Label>
                  <Textarea
                    value={conteudo[key] ?? ""}
                    onChange={(e) => setConteudo({ ...conteudo, [key]: e.target.value })}
                    rows={3}
                    className="mt-1 text-sm"
                  />
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConteudo(null)}>Voltar</Button>
                <Button size="sm" onClick={handleDownload} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">{saving ? "Salvando..." : "Baixar PDF e salvar"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
