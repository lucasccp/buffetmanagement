import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, eventoStatusLabels } from "@/lib/formatters";
import { CalendarDays, DollarSign, TrendingDown, TrendingUp, Ticket, CalendarIcon, X, Filter, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = {
  faturamento: "hsl(152, 56%, 46%)",
  custo: "hsl(0, 84%, 60%)",
  lucro: "hsl(252, 59%, 48%)",
  entrada: "hsl(152, 56%, 46%)",
  saida: "hsl(0, 84%, 60%)",
  saldo: "hsl(217, 91%, 60%)",
};

const STATUS_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 56%, 46%)",
  "hsl(0, 84%, 60%)",
];

function DatePicker({ label, date, onSelect }: { label: string; date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-3 w-3" />
          {date ? format(date, "dd/MM/yy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
      </PopoverContent>
    </Popover>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-6" style={{ color: p.color }}>
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ height = 240 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-muted-foreground text-xs" style={{ height }}>
      Sem dados para exibir
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

  // Cash flow data
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["caixa_movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("caixa_movimentacoes").select("*, eventos(nome_evento)").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalEntradas = movimentacoes.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentacoes.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  // Monthly cash flow for chart
  const caixaMensal = useMemo(() => {
    const map = new Map<string, { entradas: number; saidas: number }>();
    movimentacoes.forEach((m) => {
      const mes = m.data?.slice(0, 7);
      if (!mes) return;
      const curr = map.get(mes) || { entradas: 0, saidas: 0 };
      if (m.tipo === "entrada") curr.entradas += m.valor;
      else curr.saidas += m.valor;
      map.set(mes, curr);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({
        mes,
        mesLabel: format(new Date(mes + "-01"), "MMM/yy", { locale: ptBR }),
        entradas: v.entradas,
        saidas: v.saidas,
        saldo: v.entradas - v.saidas,
      }));
  }, [movimentacoes]);

  // Recent transactions (last 5)
  const recentTransactions = movimentacoes.slice(0, 8);

  const faturamento = metrics?.faturamento_total ?? 0;
  const custo = metrics?.custo_total ?? 0;
  const lucro = faturamento - custo;
  const clearFilters = () => { setDataInicio(undefined); setDataFim(undefined); setEventoId(""); };

  const kpis = [
    { label: "Eventos", value: String(metrics?.total_eventos ?? 0), icon: CalendarDays, accent: "text-primary", bg: "bg-primary/5" },
    { label: "Faturamento", value: formatCurrency(faturamento), icon: DollarSign, accent: "text-success", bg: "bg-success/5" },
    { label: "Custos", value: formatCurrency(custo), icon: TrendingDown, accent: "text-destructive", bg: "bg-destructive/5" },
    { label: "Lucro", value: formatCurrency(lucro), icon: TrendingUp, accent: lucro >= 0 ? "text-success" : "text-destructive", bg: lucro >= 0 ? "bg-success/5" : "bg-destructive/5" },
    { label: "Ticket Médio", value: formatCurrency(metrics?.ticket_medio ?? 0), icon: Ticket, accent: "text-info", bg: "bg-info/5" },
  ];

  const pieData = (statusData ?? []).map((s) => ({
    name: eventoStatusLabels[s.status ?? ""] ?? s.status,
    value: Number(s.total ?? 0),
  }));

  const totalEventos = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <DatePicker label="Início" date={dataInicio} onSelect={setDataInicio} />
            <DatePicker label="Fim" date={dataFim} onSelect={setDataFim} />
            <Select value={eventoId} onValueChange={setEventoId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todos eventos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos eventos</SelectItem>
                {eventos.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.nome_evento}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="eventos" className="space-y-5">
          <TabsList className="h-9 overflow-x-auto">
            <TabsTrigger value="eventos" className="text-xs gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Eventos</TabsTrigger>
            <TabsTrigger value="caixa" className="text-xs gap-1.5"><Wallet className="h-3.5 w-3.5" />Caixa</TabsTrigger>
          </TabsList>

          {/* ===== EVENTOS TAB ===== */}
          <TabsContent value="eventos" className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.bg)}>
                        <kpi.icon className={cn("h-4 w-4", kpi.accent)} />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <div className="text-lg font-semibold tracking-tight">{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-0 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Faturamento vs Custos</h3>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.faturamento }} />Faturamento</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.custo }} />Custos</span>
                    </div>
                  </div>
                  {mensal.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={mensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(240 5% 96%)" }} />
                        <Bar dataKey="faturamento_mes" name="Faturamento" fill={COLORS.faturamento} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="custo_mes" name="Custos" fill={COLORS.custo} radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none">
                <CardContent className="p-5">
                  <h3 className="text-sm font-medium mb-2">Eventos por Status</h3>
                  {pieData.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <ResponsiveContainer width={180} height={180}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                              {pieData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-2xl font-semibold">{totalEventos}</span>
                          <span className="text-[10px] text-muted-foreground">total</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 w-full">
                        {pieData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                            <span className="font-medium ml-auto">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyChart height={180} />}
                </CardContent>
              </Card>
            </div>

            {/* Profit Area Chart */}
            <Card className="border-0 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Evolução do Lucro</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.lucro }} />Lucro mensal
                  </div>
                </div>
                {mensal.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={mensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.lucro} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={COLORS.lucro} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="lucro_mes" name="Lucro" stroke={COLORS.lucro} strokeWidth={2} fill="url(#lucroGrad)" dot={{ r: 3, fill: COLORS.lucro, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={200} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CAIXA TAB ===== */}
          <TabsContent value="caixa" className="space-y-5">
            {/* Caixa KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/5">
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Entradas</span>
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-success">{formatCurrency(totalEntradas)}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/5">
                      <ArrowDownCircle className="h-4 w-4 text-destructive" />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Saídas</span>
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-destructive">{formatCurrency(totalSaidas)}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", saldo >= 0 ? "bg-success/5" : "bg-destructive/5")}>
                      <Wallet className={cn("h-4 w-4", saldo >= 0 ? "text-success" : "text-destructive")} />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Saldo</span>
                  </div>
                  <div className={cn("text-lg font-semibold tracking-tight", saldo >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(saldo)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Caixa Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bar: Entradas vs Saídas mensal */}
              <Card className="lg:col-span-2 border-0 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Entradas vs Saídas</h3>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.entrada }} />Entradas</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.saida }} />Saídas</span>
                    </div>
                  </div>
                  {caixaMensal.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={caixaMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(240 5% 96%)" }} />
                        <Bar dataKey="entradas" name="Entradas" fill={COLORS.entrada} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="saidas" name="Saídas" fill={COLORS.saida} radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </CardContent>
              </Card>

              {/* Recent transactions */}
              <Card className="border-0 shadow-none">
                <CardContent className="p-5">
                  <h3 className="text-sm font-medium mb-4">Últimas Movimentações</h3>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            m.tipo === "entrada" ? "bg-success/10" : "bg-destructive/10"
                          )}>
                            {m.tipo === "entrada"
                              ? <ArrowUpCircle className="h-3.5 w-3.5 text-success" />
                              : <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.descricao}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {m.data ? format(new Date(m.data + "T00:00:00"), "dd/MM/yy") : "—"}
                              {m.automatica && <Badge variant="secondary" className="ml-1.5 text-[9px] py-0 px-1">Auto</Badge>}
                            </p>
                          </div>
                          <span className={cn("text-xs font-semibold shrink-0",
                            m.tipo === "entrada" ? "text-success" : "text-destructive"
                          )}>
                            {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground text-xs h-[200px]">
                      Nenhuma movimentação
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Saldo Area Chart */}
            <Card className="border-0 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Evolução do Saldo</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.saldo }} />Saldo mensal
                  </div>
                </div>
                {caixaMensal.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={caixaMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.saldo} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={COLORS.saldo} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="saldo" name="Saldo" stroke={COLORS.saldo} strokeWidth={2} fill="url(#saldoGrad)" dot={{ r: 3, fill: COLORS.saldo, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={200} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
