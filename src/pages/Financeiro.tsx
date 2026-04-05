import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate, parcelaStatusLabels } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useNavigate } from "react-router-dom";

export default function Financeiro() {
  const navigate = useNavigate();
  const [agrupamento, setAgrupamento] = useState("mes");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Update overdue parcelas on load
  useQuery({
    queryKey: ["atualizar_atrasadas"],
    queryFn: async () => {
      const { data } = await supabase.rpc("atualizar_parcelas_atrasadas");
      return data;
    },
    staleTime: 60000,
  });

  // Financial dashboard summary
  const { data: resumo } = useQuery({
    queryKey: ["financeiro_parcelas", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_financeiro_parcelas", {
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Cash flow grouped
  const { data: fluxo = [] } = useQuery({
    queryKey: ["fluxo_caixa_parcelas", agrupamento, dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fluxo_caixa_parcelas", {
        p_agrupamento: agrupamento,
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  // All parcelas with evento name for the list view
  const { data: parcelas = [] } = useQuery({
    queryKey: ["todas_parcelas", filtroStatus, dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("parcelas_pagamento")
        .select("*, eventos(nome_evento)")
        .order("data_vencimento");

      if (filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus as any);
      }
      if (dataInicio) query = query.gte("data_vencimento", dataInicio);
      if (dataFim) query = query.lte("data_vencimento", dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const statusConfig: Record<string, { class: string }> = {
    pendente: { class: "bg-muted text-muted-foreground" },
    pago: { class: "bg-success/10 text-success border-success/20" },
    atrasado: { class: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  const r = resumo as any;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Controle de Pagamentos</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-36 h-8 text-xs" />
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-none">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">A Receber</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(r?.total_a_receber)}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-[10px] text-success font-medium uppercase">Recebido</span>
              </div>
              <div className="text-lg font-semibold text-success">{formatCurrency(r?.total_recebido)}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-[10px] text-destructive font-medium uppercase">Atrasado</span>
              </div>
              <div className="text-lg font-semibold text-destructive">{formatCurrency(r?.total_atrasado)}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Eventos c/ Pendência</span>
              </div>
              <div className="text-lg font-semibold">{r?.eventos_com_pendencia ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="fluxo">
          <TabsList>
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="parcelas">Todas as Parcelas</TabsTrigger>
          </TabsList>

          {/* Cash Flow Tab */}
          <TabsContent value="fluxo">
            <Card className="border shadow-none mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Fluxo de Caixa - Parcelas</span>
                  <Select value={agrupamento} onValueChange={setAgrupamento}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dia">Por Dia</SelectItem>
                      <SelectItem value="semana">Por Semana</SelectItem>
                      <SelectItem value="mes">Por Mês</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(fluxo as any[]).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fluxo as any[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="entradas_realizadas" name="Recebido" fill="hsl(var(--success, 142 71% 45%))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="entradas_previstas" name="Previsto" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12 text-sm">Nenhum dado de fluxo disponível</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Parcelas Tab */}
          <TabsContent value="parcelas">
            <Card className="border shadow-none mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Parcelas</span>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        <TableRow
                          key={p.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/eventos/${p.evento_id}`)}
                        >
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
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                            Nenhuma parcela encontrada
                          </TableCell>
                        </TableRow>
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
