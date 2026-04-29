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
import { Plus, Eye, FileText, Upload, Pencil } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatCurrency } from "@/lib/formatters";
import { generateCardapioPdf } from "@/lib/generateCardapioPdf";
import { ImportCardapioDialog } from "@/components/ImportCardapioDialog";
import { EditCardapioDialog } from "@/components/EditCardapioDialog";
import { CardapioFormFields, emptyCategorias, flattenCategorias, type CategoriaForm } from "@/components/CardapioFormFields";

export default function Cardapio() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [valorPP, setValorPP] = useState("");
  const [categorias, setCategorias] = useState<CategoriaForm[]>(emptyCategorias());
  const [viewId, setViewId] = useState<string | null>(null);
  const [pdfCardapioId, setPdfCardapioId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
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

  const resetForm = () => {
    setNome("");
    setValorPP("");
    setCategorias(emptyCategorias());
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("cardapios")
        .insert({ nome, valor_sugerido_pp: parseFloat(valorPP) || 0 })
        .select()
        .single();
      if (error) throw error;

      const flat = flattenCategorias(categorias);
      if (flat.length > 0) {
        const { error: err2 } = await supabase
          .from("cardapio_itens")
          .insert(flat.map((i) => ({ cardapio_id: data.id, nome: i.nome, categoria: i.categoria })));
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      setOpen(false);
      resetForm();
      toast.success("Cardápio cadastrado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao cadastrar cardápio."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cardapios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cardapios"] }); toast.success("Cardápio removido!"); },
  });

  const viewCardapio = cardapios.find((c) => c.id === viewId);

  // Agrupa itens da visualização por categoria
  const groupedView = (() => {
    if (!viewCardapio?.cardapio_itens) return [];
    const map = new Map<string, { id: string; nome: string }[]>();
    for (const it of viewCardapio.cardapio_itens as any[]) {
      const key = (it.categoria ?? "").trim() || "Sem categoria";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ id: it.id, nome: it.nome });
    }
    return Array.from(map.entries());
  })();

  return (
    <AppLayout>
      <div className="space-y-5">
         <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Cardápios</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Importar PDF
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Cardápio</Button></DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
                <DialogHeader className="shrink-0 border-b px-6 py-4">
                  <DialogTitle>Novo Cardápio</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nome *</Label>
                        <Input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Valor por Pessoa</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={valorPP}
                          onChange={(e) => setValorPP(e.target.value)}
                          className="mt-1"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <CardapioFormFields categorias={categorias} onChange={setCategorias} />
                  </div>
                  <div className="shrink-0 border-t px-6 py-3 bg-background">
                    <Button type="submit" className="w-full" size="sm" disabled={createMut.isPending || !nome.trim()}>
                      {createMut.isPending ? "Salvando..." : "Cadastrar Cardápio"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(c.id)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewCardapio?.nome}</DialogTitle></DialogHeader>
            {viewCardapio && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Valor sugerido por pessoa: <span className="font-semibold text-foreground">{formatCurrency(viewCardapio.valor_sugerido_pp)}</span></p>
                {groupedView.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum item</p>
                ) : (
                  <div className="space-y-3">
                    {groupedView.map(([catNome, itens]) => (
                      <div key={catNome} className="rounded-lg border bg-muted/15 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">{catNome}</Badge>
                          <span className="text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
                        </div>
                        <div className="space-y-1.5">
                          {itens.map((i) => (
                            <div key={i.id} className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              {i.nome}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!pdfCardapioId} onOpenChange={() => setPdfCardapioId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Gerar PDF de Cotação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nome da Empresa</Label><Input value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Telefone</Label><Input value={empresaTelefone} onChange={(e) => setEmpresaTelefone(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Instagram</Label><Input value={empresaInstagram} onChange={(e) => setEmpresaInstagram(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Slogan</Label><Input value={empresaSlogan} onChange={(e) => setEmpresaSlogan(e.target.value)} className="mt-1" /></div>
              <Button className="w-full" size="sm" onClick={() => {
                const cardapio = cardapios.find((c) => c.id === pdfCardapioId);
                if (cardapio) {
                  generateCardapioPdf([cardapio], { nome: empresaNome, telefone: empresaTelefone, instagram: empresaInstagram, slogan: empresaSlogan });
                  setPdfCardapioId(null);
                  toast.success("PDF gerado com sucesso!");
                }
              }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />Gerar PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ImportCardapioDialog open={importOpen} onOpenChange={setImportOpen} />
        <EditCardapioDialog cardapio={cardapios.find((c) => c.id === editId) ?? null} open={!!editId} onOpenChange={() => setEditId(null)} />
      </div>
    </AppLayout>
  );
}
