import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Plus, ExternalLink, ArrowUpCircle, ArrowDownCircle, Wallet, CalendarIcon, X, Filter, TrendingUp } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COLORS = {
  entrada: "hsl(152, 56%, 46%)",
  saida: "hsl(0, 84%, 60%)",
  saldo: "hsl(217, 91%, 60%)",
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

export default function Caixa() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [eventoId, setEventoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const dateArgs = useMemo(() => ({
    p_data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : undefined,
    p_data_fim: dataFim ? format(dataFim, "yyyy-MM-dd") : undefined,
  }), [dataInicio, dataFim]);

  const hasFilters = dataInicio || dataFim;

  // Caixa metrics from SQL
  const { data: caixaMetrics } = useQuery({
    queryKey: ["caixa_metrics", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_caixa_metrics" as any, dateArgs);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  // Monthly flow chart
  const { data: fluxoMensal = [] } = useQuery({
    queryKey: ["caixa_fluxo_mensal", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_caixa_fluxo_mensal" as any, dateArgs);
      if (error) throw error;
      return ((data as any[]) ?? []).map((d: any) => ({
        ...d,
        mesLabel: d.mes ? format(new Date(d.mes + "-01"), "MMM/yy", { locale: ptBR }) : d.mes,
      }));
    },
  });

  // Cumulative balance
  const { data: saldoAcumulado = [] } = useQuery({
    queryKey: ["caixa_saldo_acumulado", dateArgs],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_caixa_saldo_acumulado" as any, dateArgs);
      if (error) throw error;
      return ((data as any[]) ?? []).map((d: any) => ({
        ...d,
        mesLabel: d.mes ? format(new Date(d.mes + "-01"), "MMM/yy", { locale: ptBR }) : d.mes,
      }));
    },
  });

  // Movimentações table
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["caixa_movimentacoes", dateArgs],
    queryFn: async () => {
      let query = supabase.from("caixa_movimentacoes").select("*, eventos(nome_evento)").order("data", { ascending: false });
      if (dateArgs.p_data_inicio) query = query.gte("data", dateArgs.p_data_inicio);
      if (dateArgs.p_data_fim) query = query.lte("data", dateArgs.p_data_fim);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("id, nome_evento").order("nome_evento");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      let notaUrl: string | null = null;
      if (file) {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("notas-fiscais").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: signedData } = await supabase.storage.from("notas-fiscais").createSignedUrl(path, 3600);
        notaUrl = signedData?.signedUrl || path;
        setUploading(false);
      }
      const { error } = await supabase.from("caixa_movimentacoes").insert({
        tipo, descricao, valor: parseFloat(valor), data,
        evento_id: eventoId && eventoId !== "none" ? eventoId : null,
        nota_fiscal_url: notaUrl, automatica: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["caixa_metrics"] });
      qc.invalidateQueries({ queryKey: ["caixa_fluxo_mensal"] });
      qc.invalidateQueries({ queryKey: ["caixa_saldo_acumulado"] });
      setOpen(false);
      resetForm();
      toast.success("Movimentação registrada!");
    },
    onError: () => setUploading(false),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caixa_movimentacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["caixa_metrics"] });
      qc.invalidateQueries({ queryKey: ["caixa_fluxo_mensal"] });
      qc.invalidateQueries({ queryKey: ["caixa_saldo_acumulado"] });
      toast.success("Movimentação removida!");
    },
  });

  const resetForm = () => { setTipo("entrada"); setDescricao(""); setValor(""); setData(new Date().toISOString().split("T")[0]); setEventoId(""); setFile(null); };

  const cm = caixaMetrics as any;
  const saldoAtual = Number(cm?.saldo_atual ?? 0);
  const saldoFuturo = Number(cm?.saldo_futuro ?? 0);

  const kpis = [
    { label: "Saldo Atual", value: formatCurrency(saldoAtual), icon: Wallet, accent: saldoAtual >= 0 ? "text-success" : "text-destructive", bg: saldoAtual >= 0 ? "bg-success/5" : "bg-destructive/5" },
    { label: "Saldo Futuro", value: formatCurrency(saldoFuturo), icon: TrendingUp, accent: saldoFuturo >= 0 ? "text-info" : "text-destructive", bg: saldoFuturo >= 0 ? "bg-info/5" : "bg-destructive/5" },
    { label: "Entradas", value: formatCurrency(cm?.entradas_realizadas), icon: ArrowUpCircle, accent: "text-success", bg: "bg-success/5" },
    { label: "Saídas", value: formatCurrency(cm?.saidas), icon: ArrowDownCircle, accent: "text-destructive", bg: "bg-destructive/5" },
  ];

  const clearFilters = () => { setDataInicio(undefined); setDataFim(undefined); };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Dashboard de Caixa</h1>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Movimentação</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-3">
                  <div>
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as "entrada" | "saida")}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required className="mt-1" /></div>
                    <div><Label className="text-xs">Data *</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="mt-1" /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Evento (opcional)</Label>
                    <Select value={eventoId} onValueChange={setEventoId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {eventos.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.nome_evento}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nota Fiscal (opcional)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" />
                  </div>
                  <Button type="submit" className="w-full" size="sm" disabled={createMut.isPending || uploading}>
                    {uploading ? "Enviando..." : "Registrar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Flow Chart */}
          <Card className="border-0 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Fluxo de Caixa Mensal</h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.entrada }} />Entradas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.saida }} />Saídas</span>
                </div>
              </div>
              {fluxoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={fluxoMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                    <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(240 5% 96%)" }} />
                    <Bar dataKey="entradas" name="Entradas" fill={COLORS.entrada} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="saidas" name="Saídas" fill={COLORS.saida} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>

          {/* Cumulative Balance */}
          <Card className="border-0 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Saldo Acumulado</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS.saldo }} />Saldo
                </div>
              </div>
              {saldoAcumulado.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={saldoAcumulado} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.saldo} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={COLORS.saldo} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="saldo_acumulado" name="Saldo" stroke={COLORS.saldo} strokeWidth={2} fill="url(#saldoGrad)" dot={{ r: 3, fill: COLORS.saldo, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
        </div>

        {/* Movimentações Table */}
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-medium">Movimentações</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Evento</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">NF</TableHead>
                    <TableHead className="text-xs w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(m.data)}</TableCell>
                      <TableCell>
                        {m.tipo === "entrada" ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs"><ArrowUpCircle className="h-3 w-3 mr-1" />Entrada</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs"><ArrowDownCircle className="h-3 w-3 mr-1" />Saída</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.descricao}
                        {m.automatica && <Badge variant="secondary" className="ml-2 text-[10px]">Auto</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.eventos?.nome_evento ?? "—"}</TableCell>
                      <TableCell className={cn("text-sm font-medium text-right", m.tipo === "entrada" ? "text-success" : "text-destructive")}>
                        {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {m.nota_fiscal_url ? (
                          <a href={m.nota_fiscal_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </a>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {!m.automatica && (
                          <DeleteConfirmDialog onConfirm={() => deleteMut.mutate(m.id)} title="Excluir movimentação" description="Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita." />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimentacoes.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">Nenhuma movimentação registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
