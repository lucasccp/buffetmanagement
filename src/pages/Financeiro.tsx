import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, AlertTriangle, CheckCircle, TrendingDown, CalendarIcon, X, Filter } from "lucide-react";
import { formatCurrency, formatDate, parcelaStatusLabels } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pago: "hsl(152, 56%, 46%)",
  pendente: "hsl(38, 92%, 50%)",
  atrasado: "hsl(0, 84%, 60%)",
};

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

export default function Financeiro() {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [agrupamento, setAgrupamento] = useState("mes");

  const dateArgs = useMemo(() => ({
    p_data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : undefined,
    p_data_fim: dataFim ? format(dataFim, "yyyy-MM-dd") : undefined,
  }), [dataInicio, dataFim]);

  const hasFilters = dataInicio || dataFim;

  // Update overdue parcelas
  useQuery({
    queryKey: ["atualizar_atrasadas"],
    queryFn: async () => {
      const { data } = await supabase.rpc("atualizar_parcelas_atrasadas");
      return data;
    },
    staleTime: 60000,
  });

  // Financial metrics
  const { data: metrics } = useQuery({
    queryKey: ["financeiro_metrics", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_financeiro_metrics" as any, dateArgs);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  // Cash flow chart
  const { data: fluxo = [] } = useQuery({
    queryKey: ["fluxo_caixa_parcelas", agrupamento, dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fluxo_caixa_parcelas", {
        p_agrupamento: agrupamento,
        p_data_inicio: dateArgs.p_data_inicio || null,
        p_data_fim: dateArgs.p_data_fim || null,
      });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        periodoLabel: d.periodo,
      }));
    },
  });

  // Parcelas distribution
  const { data: distribuicao = [] } = useQuery({
    queryKey: ["parcelas_distribuicao", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_parcelas_distribuicao" as any, dateArgs);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Events ranking
  const { data: ranking = [] } = useQuery({
    queryKey: ["eventos_ranking", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_eventos_ranking" as any, { ...dateArgs, p_limit: 10 });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // All parcelas for table
  const { data: parcelas = [] } = useQuery({
    queryKey: ["todas_parcelas", filtroStatus, dateArgs],
    queryFn: async () => {
      let query = supabase
        .from("parcelas_pagamento")
        .select("*, eventos(nome_evento)")
        .order("data_vencimento");

      if (filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus as any);
      }
      if (dateArgs.p_data_inicio) query = query.gte("data_vencimento", dateArgs.p_data_inicio);
      if (dateArgs.p_data_fim) query = query.lte("data_vencimento", dateArgs.p_data_fim);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const r = metrics as any;
  const clearFilters = () => { setDataInicio(undefined); setDataFim(undefined); };

  const statusConfig: Record<string, { class: string }> = {
    pendente: { class: "bg-muted text-muted-foreground" },
    pago: { class: "bg-success/10 text-success border-success/20" },
    atrasado: { class: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  const pieData = distribuicao.map((d: any) => ({
    name: parcelaStatusLabels[d.status] ?? d.status,
    value: Number(d.valor ?? 0),
    count: Number(d.total ?? 0),
    status: d.status,
  }));

  const kpis = [
    { label: "Recebido", value: formatCurrency(r?.total_recebido), icon: CheckCircle, accent: "text-success", bg: "bg-success/5" },
    { label: "A Receber", value: formatCurrency(r?.total_a_receber), icon: DollarSign, accent: "text-primary", bg: "bg-primary/5" },
    { label: "Atrasado", value: formatCurrency(r?.total_atrasado), icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/5" },
    { label: "Inadimplência", value: `${Number(r?.taxa_inadimplencia ?? 0)}%`, icon: TrendingDown, accent: "text-destructive", bg: "bg-destructive/5" },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header + Filters */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard Financeiro</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <DatePicker label="Início" date={dataInicio} onSelect={setDataInicio} />
            <DatePicker label="Fim" date={dataFim} onSelect={setDataFim} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cash Flow Chart */}
          <Card className="lg:col-span-2 border-0 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Fluxo de Caixa - Parcelas</h3>
                <Select value={agrupamento} onValueChange={setAgrupamento}>
                  <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Por Dia</SelectItem>
                    <SelectItem value="semana">Por Semana</SelectItem>
                    <SelectItem value="mes">Por Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(fluxo as any[]).length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fluxo as any[]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                    <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(240 5% 96%)" }} />
                    <Bar dataKey="entradas_realizadas" name="Recebido" fill={STATUS_COLORS.pago} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="entradas_previstas" name="Pendente" fill={STATUS_COLORS.pendente} radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>

          {/* Status Pie */}
          <Card className="border-0 shadow-none">
            <CardContent className="p-5">
              <h3 className="text-sm font-medium mb-2">Status das Parcelas</h3>
              {pieData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="count" stroke="none">
                          {pieData.map((d: any) => <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "hsl(240 4% 46%)"} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-semibold">{pieData.reduce((s, d) => s + d.count, 0)}</span>
                      <span className="text-[10px] text-muted-foreground">parcelas</span>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3 w-full">
                    {pieData.map((d: any) => (
                      <div key={d.status} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] ?? "hsl(240 4% 46%)" }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium ml-auto">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyChart height={180} />}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Ranking + Parcelas */}
        <Tabs defaultValue="ranking">
          <TabsList className="h-9">
            <TabsTrigger value="ranking" className="text-xs">Ranking de Eventos</TabsTrigger>
            <TabsTrigger value="parcelas" className="text-xs">Todas as Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <Card className="border-0 shadow-none mt-3">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Evento</TableHead>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs text-right">Faturamento</TableHead>
                        <TableHead className="text-xs text-right hidden md:table-cell">Custo</TableHead>
                        <TableHead className="text-xs text-right">Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ranking as any[]).map((ev: any, i: number) => (
                        <TableRow key={ev.evento_id} className="cursor-pointer" onClick={() => navigate(`/eventos/${ev.evento_id}`)}>
                          <TableCell className="text-sm text-muted-foreground font-medium">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{ev.nome_evento}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(ev.data_evento)}</TableCell>
                          <TableCell className="text-sm text-right font-medium text-success">{formatCurrency(ev.faturamento)}</TableCell>
                          <TableCell className="text-sm text-right text-muted-foreground hidden md:table-cell">{formatCurrency(ev.custo)}</TableCell>
                          <TableCell className={cn("text-sm text-right font-medium", Number(ev.lucro) >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(ev.lucro)}</TableCell>
                        </TableRow>
                      ))}
                      {ranking.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Nenhum evento encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parcelas">
            <Card className="border-0 shadow-none mt-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Parcelas</span>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Evento</TableHead>
                        <TableHead className="text-xs">Parcela</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Vencimento</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Pagamento</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(parcelas as any[]).map((p: any) => (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/eventos/${p.evento_id}`)}>
                          <TableCell className="text-sm">{p.eventos?.nome_evento ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">#{p.numero_parcela}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(p.valor)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(p.data_vencimento)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(p.data_pagamento)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig[p.status]?.class ?? ""}>
                              {parcelaStatusLabels[p.status] ?? p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {parcelas.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Nenhuma parcela encontrada</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
