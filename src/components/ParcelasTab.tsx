import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, CheckCircle, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, parcelaStatusLabels } from "@/lib/formatters";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

const statusConfig: Record<string, { class: string; icon: typeof Clock }> = {
  pendente: { class: "bg-muted text-muted-foreground", icon: Clock },
  pago: { class: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  atrasado: { class: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

export default function ParcelasTab({ eventoId }: { eventoId: string }) {
  const qc = useQueryClient();
  const [openGerar, setOpenGerar] = useState(false);
  const [numParcelas, setNumParcelas] = useState("1");
  const [valorTotal, setValorTotal] = useState("");
  const [dataInicial, setDataInicial] = useState("");

  // Fetch evento to get valor_total
  const { data: evento } = useQuery({
    queryKey: ["evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("valor_total").eq("id", eventoId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch parcelas
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas_pagamento", eventoId],
    queryFn: async () => {
      // First update overdue
      await supabase.rpc("atualizar_parcelas_atrasadas");
      const { data, error } = await supabase
        .from("parcelas_pagamento")
        .select("*")
        .eq("evento_id", eventoId)
        .order("numero_parcela");
      if (error) throw error;
      return data;
    },
  });

  // Fetch summary
  const { data: resumo } = useQuery({
    queryKey: ["parcelas_resumo", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_parcelas_resumo", { p_evento_id: eventoId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Generate installments
  const gerarMut = useMutation({
    mutationFn: async () => {
      const vt = parseFloat(valorTotal);
      const np = parseInt(numParcelas);
      if (!vt || !np || !dataInicial) throw new Error("Preencha todos os campos");

      const { error } = await supabase.rpc("gerar_parcelas", {
        p_evento_id: eventoId,
        p_valor_total: vt,
        p_num_parcelas: np,
        p_data_inicial: dataInicial,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      setOpenGerar(false);
      toast.success("Parcelas geradas com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar parcelas"),
  });

  // Mark as paid
  const pagarMut = useMutation({
    mutationFn: async (parcelaId: string) => {
      const { error } = await supabase
        .from("parcelas_pagamento")
        .update({ status: "pago" as any, data_pagamento: new Date().toISOString().split("T")[0] })
        .eq("id", parcelaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      toast.success("Parcela marcada como paga!");
    },
  });

  // Delete all parcelas
  const deletarTodasMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parcelas_pagamento").delete().eq("evento_id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcelas_pagamento", eventoId] });
      qc.invalidateQueries({ queryKey: ["parcelas_resumo", eventoId] });
      toast.success("Parcelas removidas!");
    },
  });

  return (
    <Card className="mt-4 border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm font-medium">
          <span>Parcelas de Pagamento</span>
          <div className="flex items-center gap-2">
            {parcelas.length > 0 && (
              <DeleteConfirmDialog
                onConfirm={() => deletarTodasMut.mutate()}
                title="Excluir todas as parcelas"
                description="Deseja excluir todas as parcelas deste evento? Isso não pode ser desfeito."
              />
            )}
            <Dialog open={openGerar} onOpenChange={setOpenGerar}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs" disabled={parcelas.length > 0}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Gerar Parcelas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Gerar Parcelas</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); gerarMut.mutate(); }} className="space-y-3">
                  <div>
                    <Label className="text-xs">Valor Total *</Label>
                    <Input
                      type="number" step="0.01"
                      value={valorTotal || (evento?.valor_total ?? "")}
                      onChange={(e) => setValorTotal(e.target.value)}
                      required className="mt-1"
                      placeholder={evento?.valor_total ? `Sugestão: ${formatCurrency(evento.valor_total)}` : ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nº de Parcelas *</Label>
                      <Input type="number" min="1" max="48" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} required className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Data Inicial *</Label>
                      <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} required className="mt-1" />
                    </div>
                  </div>
                  {valorTotal && numParcelas && parseInt(numParcelas) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {numParcelas}x de {formatCurrency(parseFloat(valorTotal) / parseInt(numParcelas))}
                    </p>
                  )}
                  <Button type="submit" className="w-full" size="sm" disabled={gerarMut.isPending}>
                    {gerarMut.isPending ? "Gerando..." : "Gerar Parcelas"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        {resumo && (resumo as any).total_parcelas > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] text-muted-foreground font-medium">Total</div>
              <div className="text-sm font-semibold">{formatCurrency((resumo as any).total_valor)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] text-success font-medium">Recebido</div>
              <div className="text-sm font-semibold text-success">{formatCurrency((resumo as any).total_pago)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] text-muted-foreground font-medium">Pendente</div>
              <div className="text-sm font-semibold">{formatCurrency((resumo as any).total_pendente)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] text-destructive font-medium">Atrasado</div>
              <div className="text-sm font-semibold text-destructive">{formatCurrency((resumo as any).total_atrasado)}</div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Valor</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Pagamento</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p: any) => {
                const cfg = statusConfig[p.status] ?? statusConfig.pendente;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-muted-foreground">{p.numero_parcela}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.valor)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.data_vencimento)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(p.data_pagamento)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.class}>
                        {parcelaStatusLabels[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status !== "pago" && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs gap-1 text-success hover:text-success"
                          onClick={() => pagarMut.mutate(p.id)}
                          disabled={pagarMut.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {parcelas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    Nenhuma parcela gerada. Clique em "Gerar Parcelas" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
