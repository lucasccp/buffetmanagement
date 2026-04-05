import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, ShieldAlert, Lightbulb, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  resumo: string;
  problemas: string[];
  oportunidades: string[];
  alertas: string[];
  recomendacoes: string[];
}

export default function InsightsPanel() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para usar esta funcionalidade.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-financeiro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar análise";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sections = analysis
    ? [
        {
          key: "problemas",
          title: "Problemas Identificados",
          icon: AlertTriangle,
          items: analysis.problemas,
          color: "text-destructive",
          bg: "bg-destructive/5",
          border: "border-destructive/20",
          dot: "bg-destructive",
        },
        {
          key: "oportunidades",
          title: "Oportunidades",
          icon: TrendingUp,
          items: analysis.oportunidades,
          color: "text-success",
          bg: "bg-success/5",
          border: "border-success/20",
          dot: "bg-success",
        },
        {
          key: "alertas",
          title: "Alertas",
          icon: ShieldAlert,
          items: analysis.alertas,
          color: "text-warning",
          bg: "bg-warning/5",
          border: "border-warning/20",
          dot: "bg-warning",
        },
        {
          key: "recomendacoes",
          title: "Recomendações",
          icon: Lightbulb,
          items: analysis.recomendacoes,
          color: "text-primary",
          bg: "bg-primary/5",
          border: "border-primary/20",
          dot: "bg-primary",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Insights Inteligentes</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalysis}
          disabled={loading}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          {loading ? "Analisando..." : analysis ? "Atualizar análise" : "Gerar análise"}
        </Button>
      </div>

      {!analysis && !loading && !error && (
        <Card className="border border-dashed border-muted-foreground/20">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar análise" para receber insights da IA sobre a saúde financeira do seu buffet.
            </p>
          </CardContent>
        </Card>
      )}

      {error && !analysis && (
        <Card className="border border-destructive/20">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-3">
          {/* Resumo */}
          <Card className="border-0 shadow-none bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Resumo Executivo</p>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.resumo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map(
              (section) =>
                section.items.length > 0 && (
                  <Card key={section.key} className={cn("border", section.border, "shadow-none")}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <section.icon className={cn("h-3.5 w-3.5", section.color)} />
                        <span className={cn("text-xs font-medium", section.color)}>
                          {section.title}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                            <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", section.dot)} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
