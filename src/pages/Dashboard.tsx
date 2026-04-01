import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency, formatDate, eventoStatusLabels } from "@/lib/formatters";
import { CalendarDays, DollarSign, TrendingDown, TrendingUp, Ticket, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import AppLayout from "@/components/AppLayout";

const CHART_COLORS = {
  faturamento: "hsl(160, 60%, 45%)",
  custo: "hsl(0, 72%, 51%)",
  lucro: "hsl(243, 75%, 59%)",
};

const PIE_COLORS = ["hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)", "hsl(160, 60%, 45%)", "hsl(0, 72%, 51%)"];

function DateFilter({ label, date, onSelect }: { label: string; date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "dd/MM/yyyy") : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium font-heading mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [eventoId, setEventoId] = useState<string>("");

  const filterArgs = useMemo(() => ({
    p_data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : undefined,
    p_data_fim: dataFim ? format(dataFim, "yyyy-MM-dd") : undefined,
    p_evento_id: eventoId && eventoId !== "all" ? eventoId : undefined,
  }), [dataInicio, dataFim, eventoId]);

  const hasFilters = dataInicio || dataFim || eventoId;

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("id, nome_evento").order("nome_evento");
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["dashboard_filtrado", filterArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_filtrado", filterArgs);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: mensal = [] } = useQuery({
    queryKey: ["financeiro_mensal", filterArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_financeiro_mensal", filterArgs);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        mesLabel: d.mes ? format(new Date(d.mes + "-01"), "MMM/yy", { locale: ptBR }) : d.mes,
      }));
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

  const clearFilters = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
    setEventoId("");
  };

  const kpiCards = [
    { title: "Total Eventos", value: metrics?.total_eventos ?? 0, icon: CalendarDays, color: "text-primary" },
    { title: "Faturamento Total", value: formatCurrency(faturamento), icon: DollarSign, color: "text-success" },
    { title: "Custo Total", value: formatCurrency(custo), icon: TrendingDown, color: "text-destructive" },
    { title: "Lucro Total", value: formatCurrency(lucro), icon: TrendingUp, color: lucro >= 0 ? "text-success" : "text-destructive" },
    { title: "Ticket Médio", value: formatCurrency(metrics?.ticket_medio ?? 0), icon: Ticket, color: "text-info" },
  ];

  const pieData = (statusData ?? []).map((s) => ({
    name: eventoStatusLabels[s.status ?? ""] ?? s.status,
    value: Number(s.total ?? 0),
  }));

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <DateFilter label="Data Início" date={dataInicio} onSelect={setDataInicio} />
            <DateFilter label="Data Fim" date={dataFim} onSelect={setDataFim} />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Evento</span>
              <Select value={eventoId} onValueChange={setEventoId}>
                <SelectTrigger className="w-[220px] text-sm">
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {eventos.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.nome_evento}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((c) => (
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar Chart - Faturamento vs Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Faturamento vs Custos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {mensal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mensal} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="faturamento_mes" name="Faturamento" fill={CHART_COLORS.faturamento} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo_mes" name="Custos" fill={CHART_COLORS.custo} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart - Lucro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {mensal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mensal} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="lucro_mes" name="Lucro" stroke={CHART_COLORS.lucro} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Eventos por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Eventos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Resumo por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(statusData ?? []).map((s, i) => (
                <div key={s.status} className="rounded-lg p-4 text-center" style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}15` }}>
                  <div className="text-3xl font-bold font-heading" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{s.total}</div>
                  <div className="text-sm text-muted-foreground mt-1">{eventoStatusLabels[s.status ?? ""] ?? s.status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
