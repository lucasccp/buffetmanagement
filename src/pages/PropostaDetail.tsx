import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, propostaStatusLabels } from "@/lib/formatters";

const statusColors: Record<string, string> = {
  enviada: "bg-info/10 text-info border-info/20",
  aceita: "bg-success/10 text-success border-success/20",
  convertida: "bg-primary/10 text-primary border-primary/20",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function PropostaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: proposta, isLoading } = useQuery({
    queryKey: ["proposta", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("propostas" as any).select("*, leads(*), cardapios(nome)").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const aceitarMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("propostas" as any).update({ status: "aceita" }).eq("id", id!);
      if (error) throw error;
      await supabase.from("leads").update({ status: "aceita" as any }).eq("id", proposta.lead_id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposta", id] }); toast.success("Proposta marcada como aceita!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const converterMut = useMutation({
    mutationFn: async () => {
      const lead = proposta.leads;
      const { data: ev, error } = await supabase.from("eventos").insert({
        lead_id: lead.id,
        nome_evento: `Evento - ${lead.nome}`,
        tipo_evento: lead.tipo_evento,
        data_evento: lead.data_prevista,
        numero_convidados: proposta.numero_convidados ?? lead.numero_convidados,
        valor_total: proposta.valor_total ?? lead.valor_evento,
        local: lead.endereco,
        observacoes: lead.observacoes,
      }).select("id").single();
      if (error) throw error;
      if (proposta.cardapio_id) {
        await supabase.from("evento_cardapio").insert({ evento_id: ev.id, cardapio_id: proposta.cardapio_id });
      }
      await supabase.from("propostas" as any).update({ status: "convertida", evento_id: ev.id }).eq("id", id!);
      await supabase.from("leads").update({ status: "fechado" as any }).eq("id", lead.id);
      return ev.id;
    },
    onSuccess: (evId) => { toast.success("Convertida em evento!"); navigate(`/eventos/${evId}`); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !proposta) {
    return <AppLayout><div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const c = (proposta.conteudo ?? {}) as Record<string, string>;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/propostas")}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-semibold tracking-tight">Proposta — {proposta.leads?.nome}</h1>
            <Badge variant="outline" className={statusColors[proposta.status]}>{propostaStatusLabels[proposta.status]}</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground text-xs">Cardápio</span><p>{proposta.cardapios?.nome ?? "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Convidados</span><p>{proposta.numero_convidados ?? "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Valor por pessoa</span><p>{formatCurrency(Number(proposta.valor_por_pessoa ?? 0))}</p></div>
              <div><span className="text-muted-foreground text-xs">Total</span><p className="font-medium">{formatCurrency(Number(proposta.valor_total ?? 0))}</p></div>
              <div><span className="text-muted-foreground text-xs">Criada em</span><p>{formatDate(proposta.created_at)}</p></div>
              <div><span className="text-muted-foreground text-xs">Tom</span><p className="capitalize">{proposta.tom}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {proposta.pdf_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={proposta.pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Ver PDF</a>
                </Button>
              )}
              {proposta.status === "enviada" && (
                <Button size="sm" onClick={() => aceitarMut.mutate()} disabled={aceitarMut.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Marcar como aceita
                </Button>
              )}
              {(proposta.status === "aceita" || proposta.status === "enviada") && (
                <Button size="sm" variant="default" onClick={() => converterMut.mutate()} disabled={converterMut.isPending}>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />Converter em evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-medium">Conteúdo da proposta</h2>
            {Object.entries(c).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{key.replace(/_/g, " ")}</p>
                <p className="text-sm whitespace-pre-wrap">{val}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
