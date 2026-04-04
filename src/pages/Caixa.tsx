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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
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

  const saldo = movimentacoes.reduce((acc, m) => m.tipo === "entrada" ? acc + m.valor : acc - m.valor, 0);
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
        tipo, descricao, valor: parseFloat(valor), data,
        evento_id: eventoId || null, nota_fiscal_url: notaUrl, automatica: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] }); setOpen(false); resetForm(); toast.success("Movimentação registrada!"); },
    onError: () => setUploading(false),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caixa_movimentacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] }); toast.success("Movimentação removida!"); },
  });

  const resetForm = () => { setTipo("entrada"); setDescricao(""); setValor(""); setData(new Date().toISOString().split("T")[0]); setEventoId(""); setFile(null); };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Controle de Caixa</h1>
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

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground font-medium">Entradas</span>
              <p className="text-xl font-semibold text-success mt-1">{formatCurrency(totalEntradas)}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground font-medium">Saídas</span>
              <p className="text-xl font-semibold text-destructive mt-1">{formatCurrency(totalSaidas)}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground font-medium">Saldo</span>
              <p className={`text-xl font-semibold mt-1 ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(saldo)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Evento</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
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
                    <TableCell className={`text-sm font-medium ${m.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
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
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteMut.mutate(m.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
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
        </div>
      </div>
    </AppLayout>
  );
}
