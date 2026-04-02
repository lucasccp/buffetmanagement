import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ExternalLink, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

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

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["caixa_movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("caixa_movimentacoes").select("*, eventos(nome_evento)").order("data", { ascending: false });
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

  const saldo = movimentacoes.reduce((acc, m) => {
    return m.tipo === "entrada" ? acc + m.valor : acc - m.valor;
  }, 0);

  const totalEntradas = movimentacoes.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentacoes.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);

  const createMut = useMutation({
    mutationFn: async () => {
      let notaUrl: string | null = null;

      if (file) {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("notas-fiscais").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("notas-fiscais").getPublicUrl(path);
        notaUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { error } = await supabase.from("caixa_movimentacoes").insert({
        tipo,
        descricao,
        valor: parseFloat(valor),
        data,
        evento_id: eventoId || null,
        nota_fiscal_url: notaUrl,
        automatica: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
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
      toast.success("Movimentação removida!");
    },
  });

  const resetForm = () => {
    setTipo("entrada");
    setDescricao("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setEventoId("");
    setFile(null);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading">Controle de Caixa</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as "entrada" | "saida")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
              <div><Label>Valor *</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
              <div><Label>Data *</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></div>
              <div>
                <Label>Evento (opcional)</Label>
                <Select value={eventoId} onValueChange={setEventoId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {eventos.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.nome_evento}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nota Fiscal (opcional)</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending || uploading}>
                {uploading ? "Enviando arquivo..." : "Registrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Entradas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-success">{formatCurrency(totalEntradas)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saídas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(saldo)}</p></CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Nota Fiscal</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentacoes.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>{formatDate(m.data)}</TableCell>
                <TableCell>
                  {m.tipo === "entrada" ? (
                    <Badge className="bg-success/10 text-success border-success/20"><ArrowUpCircle className="h-3 w-3 mr-1" />Entrada</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20"><ArrowDownCircle className="h-3 w-3 mr-1" />Saída</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {m.descricao}
                  {m.automatica && <Badge variant="secondary" className="ml-2 text-xs">Auto</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.eventos?.nome_evento ?? "—"}</TableCell>
                <TableCell className={m.tipo === "entrada" ? "text-success font-medium" : "text-destructive font-medium"}>
                  {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                </TableCell>
                <TableCell>
                  {m.nota_fiscal_url ? (
                    <a href={m.nota_fiscal_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {!m.automatica && (
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {movimentacoes.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
