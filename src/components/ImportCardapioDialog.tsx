import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Check, X, Loader2, Sparkles, Pencil, Trash2 } from "lucide-react";
import { parsePdfCardapio, type ParsedCardapio, type ParsedItem } from "@/lib/parsePdfCardapio";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tipoBadgeColors: Record<string, string> = {
  comida: "bg-primary/10 text-primary border-primary/20",
  bebida: "bg-info/10 text-info border-info/20",
  sobremesa: "bg-warning/10 text-warning border-warning/20",
};

export function ImportCardapioDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedCardapio | null>(null);
  const [cardapioName, setCardapioName] = useState("");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<{ catIdx: number; itemIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const reset = () => {
    setStep("upload");
    setParsing(false);
    setParsed(null);
    setCardapioName("");
    setError("");
    setEditingItem(null);
    setEditValue("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um arquivo PDF.");
      return;
    }
    setError("");
    setParsing(true);
    try {
      const result = await parsePdfCardapio(file);
      const totalItems = result.categorias.reduce((sum, c) => sum + c.itens.length, 0);
      if (totalItems === 0) {
        setError("Nenhum item detectado no PDF. Verifique o arquivo.");
        setParsing(false);
        return;
      }
      setParsed(result);
      setCardapioName(result.nome_cardapio);
      setStep("preview");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Erro ao processar o PDF.");
    } finally {
      setParsing(false);
    }
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    if (!parsed) return;
    const updated = { ...parsed, categorias: parsed.categorias.map((c, ci) => {
      if (ci !== catIdx) return c;
      return { ...c, itens: c.itens.filter((_, ii) => ii !== itemIdx) };
    }).filter(c => c.itens.length > 0) };
    setParsed(updated);
  };

  const saveEditItem = () => {
    if (!parsed || !editingItem || !editValue.trim()) return;
    const updated = { ...parsed, categorias: parsed.categorias.map((c, ci) => {
      if (ci !== editingItem.catIdx) return c;
      return { ...c, itens: c.itens.map((item, ii) => {
        if (ii !== editingItem.itemIdx) return item;
        return { ...item, nome: editValue.trim() };
      }) };
    }) };
    setParsed(updated);
    setEditingItem(null);
    setEditValue("");
  };

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed) return;
      const allItems = parsed.categorias.flatMap((c) => c.itens);
      const { data, error } = await supabase
        .from("cardapios")
        .insert({ nome: cardapioName || parsed.nome_cardapio, valor_sugerido_pp: 0 })
        .select()
        .single();
      if (error) throw error;

      if (allItems.length > 0) {
        const { error: err2 } = await supabase
          .from("cardapio_itens")
          .insert(allItems.map((item) => ({ cardapio_id: data.id, nome: item.nome })));
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardapios"] });
      toast.success("Cardápio importado com sucesso!");
      onOpenChange(false);
      reset();
    },
    onError: () => toast.error("Erro ao importar cardápio."),
  });

  const totalItems = parsed?.categorias.reduce((s, c) => s + c.itens.length, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "upload" ? (
              <>Importar Cardápio via PDF</>
            ) : (
              <><Sparkles className="h-4 w-4 text-primary" />Resultado da IA</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => !parsing && fileRef.current?.click()}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Processando com IA...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Analisando categorias e itens do cardápio</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo PDF</p>
                  <p className="text-xs text-muted-foreground">A IA interpretará automaticamente o conteúdo</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {step === "preview" && parsed && (
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-xs">Nome do Cardápio</Label>
              <Input value={cardapioName} onChange={(e) => setCardapioName(e.target.value)} className="mt-1" />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{parsed.categorias.length} categoria(s) • {totalItems} item(ns) detectado(s)</span>
            </div>

            <div className="max-h-[55vh] sm:max-h-[380px] overflow-hidden flex-1 min-h-0">
              <ScrollArea className="h-full" type="always">
                <div className="space-y-3 pr-3">
                  {parsed.categorias.map((cat, ci) => (
                    <div key={ci}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="text-xs">{cat.nome}</Badge>
                        <span className="text-xs text-muted-foreground">{cat.itens.length} itens</span>
                      </div>
                      <div className="space-y-1 pl-2">
                        {cat.itens.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2 text-sm group min-w-0">
                            {editingItem?.catIdx === ci && editingItem?.itemIdx === ii ? (
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditItem();
                                    if (e.key === "Escape") { setEditingItem(null); setEditValue(""); }
                                  }}
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={saveEditItem}>
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Check className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate flex-1 min-w-0">{item.nome}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${tipoBadgeColors[item.tipo] ?? ""}`}>
                                  {item.tipo}
                                </Badge>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button
                                    size="sm" variant="ghost" className="h-6 w-6 p-0"
                                    onClick={() => { setEditingItem({ catIdx: ci, itemIdx: ii }); setEditValue(item.nome); }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(ci, ii)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" className="flex-1 max-w-[200px]" onClick={reset}>
                <X className="h-3.5 w-3.5 mr-1" />Cancelar
              </Button>
              <Button size="sm" className="flex-1 max-w-[200px]" onClick={() => importMut.mutate()} disabled={importMut.isPending || totalItems === 0}>
                <Check className="h-3.5 w-3.5 mr-1" />Confirmar Importação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
