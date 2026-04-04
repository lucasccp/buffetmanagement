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
  faturamento: "hsl(152, 56%, 46%)",
  custo: "hsl(0, 84%, 60%)",
  lucro: "hsl(252, 59%, 48%)",
};

const PIE_COLORS = ["hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(152, 56%, 46%)", "hsl(0, 84%, 60%)"];

function DateFilter({ label, date, onSelect }: { label: string; date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "dd/MM/yyyy") : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-semibold">{formatCurrency(p.value)}</span>
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

  const clearFilters = () => { setDataInicio(undefined); setDataFim(undefined); setEventoId(""); };

  const kpiCards = [
    { title: "Eventos", value: metrics?.total_eventos ?? 0, icon: CalendarDays, color: "text-primary" },
    { title: "Faturamento", value: formatCurrency(faturamento), icon: DollarSign, color: "text-success" },
    { title: "Custos", value: formatCurrency(custo), icon: TrendingDown, color: "text-destructive" },
    { title: "Lucro", value: formatCurrency(lucro), icon: TrendingUp, color: lucro >= 0 ? "text-success" : "text-destructive" },
    { title: "Ticket Médio", value: formatCurrency(metrics?.ticket_medio ?? 0), icon: Ticket, color: "text-info" },
  ];

  const pieData = (statusData ?? []).map((s) => ({
    name: eventoStatusLabels[s.status ?? ""] ?? s.status,
    value: Number(s.total ?? 0),
  }));

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-card">
          <DateFilter label="Data Início" date={dataInicio} onSelect={setDataInicio} />
          <DateFilter label="Data Fim" date={dataFim} onSelect={setDataFim} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Evento</span>
            <Select value={eventoId} onValueChange={setEventoId}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground text-xs h-9">
              <X className="h-3.5 w-3.5 mr-1" />Limpar
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((c) => (
            <Card key={c.title} className="border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{c.title}</span>
                  <c.icon className={cn("h-3.5 w-3.5", c.color)} />
                </div>
                <div className="text-xl font-semibold tracking-tight">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faturamento vs Custos</CardTitle>
            </CardHeader>
            <CardContent>
              {mensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={mensal} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="faturamento_mes" name="Faturamento" fill={CHART_COLORS.faturamento} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="custo_mes" name="Custos" fill={CHART_COLORS.custo} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">Sem dados</div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lucro por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {mensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={mensal} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="lucro_mes" name="Lucro" stroke={CHART_COLORS.lucro} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Eventos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} style={{ fontSize: 11 }}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-muted-foreground text-xs">Sem dados</div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(statusData ?? []).map((s, i) => (
                  <div key={s.status} className="rounded-lg p-4 text-center border" style={{ borderColor: `${PIE_COLORS[i % PIE_COLORS.length]}30` }}>
                    <div className="text-2xl font-semibold" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{s.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{eventoStatusLabels[s.status ?? ""] ?? s.status}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
