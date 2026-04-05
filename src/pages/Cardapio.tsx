import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, X, FileText } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatCurrency } from "@/lib/formatters";
import { generateCardapioPdf } from "@/lib/generateCardapioPdf";

export default function Cardapio() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [valorPP, setValorPP] = useState("");
  const [itensNomes, setItensNomes] = useState<string[]>([""]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [pdfCardapioId, setPdfCardapioId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("Minha Empresa");
  const [empresaTelefone, setEmpresaTelefone] = useState("(00) 00000-0000");
  const [empresaInstagram, setEmpresaInstagram] = useState("@minhaempresa");
  const [empresaSlogan, setEmpresaSlogan] = useState("Sabor e qualidade para o seu evento");

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardapios").select("*, cardapio_itens(*)").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("cardapios").insert({ nome, valor_sugerido_pp: parseFloat(valorPP) || 0 }).select().single();
      if (error) throw error;
      const validItens = itensNomes.filter((n) => n.trim());
      if (validItens.length > 0) {
        const { error: err2 } = await supabase.from("cardapio_itens").insert(validItens.map((n) => ({ cardapio_id: data.id, nome: n.trim() })));
        if (err2) throw err2;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cardapios"] }); setOpen(false); setNome(""); setValorPP(""); setItensNomes([""]); toast.success("Cardápio cadastrado!"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cardapios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cardapios"] }); toast.success("Cardápio removido!"); },
  });

  const addItemField = () => setItensNomes([...itensNomes, ""]);
  const updateItemField = (idx: number, val: string) => { const copy = [...itensNomes]; copy[idx] = val; setItensNomes(copy); };
  const removeItemField = (idx: number) => setItensNomes(itensNomes.filter((_, i) => i !== idx));

  const viewCardapio = cardapios.find((c) => c.id === viewId);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Cardápios</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Cardápio</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Cardápio</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-3">
                <div><Label className="text-xs">Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1" /></div>
                <div><Label className="text-xs">Valor Sugerido por Pessoa</Label><Input type="number" step="0.01" value={valorPP} onChange={(e) => setValorPP(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Itens do Cardápio</Label>
                  <div className="space-y-2 mt-1.5">
                    {itensNomes.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input placeholder={`Item ${idx + 1}`} value={item} onChange={(e) => updateItemField(idx, e.target.value)} />
                        {itensNomes.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => removeItemField(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addItemField} className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />Adicionar Item
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="sm" disabled={createMut.isPending}>Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Valor/Pessoa</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Itens</TableHead>
                  <TableHead className="text-xs w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cardapios.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.nome}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(c.valor_sugerido_pp)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.cardapio_itens?.slice(0, 3).map((i: any) => (
                          <Badge key={i.id} variant="outline" className="text-xs font-normal">{i.nome}</Badge>
                        ))}
                        {c.cardapio_itens?.length > 3 && <Badge variant="secondary" className="text-xs">+{c.cardapio_itens.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewId(c.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPdfCardapioId(c.id)} title="Gerar PDF"><FileText className="h-3.5 w-3.5" /></Button>
                        <DeleteConfirmDialog onConfirm={() => deleteMut.mutate(c.id)} title="Excluir cardápio" description={`Tem certeza que deseja excluir "${c.nome}"? Esta ação não pode ser desfeita.`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {cardapios.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12 text-sm">Nenhum cardápio cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewCardapio?.nome}</DialogTitle></DialogHeader>
            {viewCardapio && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Valor sugerido por pessoa: <span className="font-semibold text-foreground">{formatCurrency(viewCardapio.valor_sugerido_pp)}</span></p>
                <div>
                  <Label className="text-xs">Itens</Label>
                  <div className="mt-2 space-y-1.5">
                    {viewCardapio.cardapio_itens?.map((i: any) => (
                      <div key={i.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {i.nome}
                      </div>
                    ))}
                    {(!viewCardapio.cardapio_itens || viewCardapio.cardapio_itens.length === 0) && (
                      <p className="text-xs text-muted-foreground">Nenhum item</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
