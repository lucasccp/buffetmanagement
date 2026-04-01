import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, eventoStatusLabels } from "@/lib/formatters";
import { CalendarDays, DollarSign, TrendingDown, TrendingUp, Ticket } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["dashboard_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dashboard_metrics").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ["eventos_por_status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos_por_status").select("*");
      if (error) throw error;
      return data;
    },
  });

  const faturamento = metrics?.faturamento_total ?? 0;
  const custo = metrics?.custo_total ?? 0;
  const lucro = faturamento - custo;

  const cards = [
    { title: "Total Eventos", value: metrics?.total_eventos ?? 0, icon: CalendarDays, color: "text-primary" },
    { title: "Faturamento Total", value: formatCurrency(faturamento), icon: DollarSign, color: "text-success" },
    { title: "Custo Total", value: formatCurrency(custo), icon: TrendingDown, color: "text-destructive" },
    { title: "Lucro Total", value: formatCurrency(lucro), icon: TrendingUp, color: lucro >= 0 ? "text-success" : "text-destructive" },
    { title: "Ticket Médio", value: formatCurrency(metrics?.ticket_medio ?? 0), icon: Ticket, color: "text-info" },
  ];

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold font-heading mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Eventos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(statusData ?? []).map((s) => (
              <div key={s.status} className="bg-muted rounded-lg p-4 text-center">
                <div className="text-2xl font-bold font-heading">{s.total}</div>
                <div className="text-sm text-muted-foreground">{eventoStatusLabels[s.status ?? ""] ?? s.status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
