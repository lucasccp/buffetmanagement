import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { parsePdfCardapio, type ParsedCardapio } from "@/lib/parsePdfCardapio";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCardapioDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedCardapio | null>(null);
  const [cardapioName, setCardapioName] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setStep("upload");
    setParsing(false);
    setParsed(null);
    setCardapioName("");
    setError("");
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
      const totalItems = result.categories.reduce((sum, c) => sum + c.items.length, 0);
      if (totalItems === 0) {
        setError("Nenhum item detectado no PDF. Verifique o arquivo.");
        setParsing(false);
        return;
      }
      setParsed(result);
      setCardapioName(result.title);
      setStep("preview");
    } catch (e) {
      console.error(e);
      setError("Erro ao processar o PDF. Verifique se o arquivo contém texto selecionável.");
    } finally {
      setParsing(false);
    }
  };

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed) return;
      const allItems = parsed.categories.flatMap((c) => c.items);
      const { data, error } = await supabase
        .from("cardapios")
        .insert({ nome: cardapioName || parsed.title, valor_sugerido_pp: 0 })
        .select()
        .single();
      if (error) throw error;

      if (allItems.length > 0) {
        const { error: err2 } = await supabase
          .from("cardapio_itens")
          .insert(allItems.map((nome) => ({ cardapio_id: data.id, nome })));
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

  const totalItems = parsed?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === "upload" ? "Importar Cardápio via PDF" : "Pré-visualização"}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Processando PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo PDF</p>
                  <p className="text-xs text-muted-foreground">O PDF deve conter texto selecionável</p>
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
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome do Cardápio</Label>
              <Input value={cardapioName} onChange={(e) => setCardapioName(e.target.value)} className="mt-1" />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{parsed.categories.length} categoria(s) • {totalItems} item(ns) detectado(s)</span>
            </div>

            <ScrollArea className="max-h-[320px]">
              <div className="space-y-3 pr-3">
                {parsed.categories.map((cat, ci) => (
                  <div key={ci}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="secondary" className="text-xs">{cat.name}</Badge>
                      <span className="text-xs text-muted-foreground">{cat.items.length} itens</span>
                    </div>
                    <div className="space-y-1 pl-2">
                      {cat.items.map((item, ii) => (
                        <div key={ii} className="flex items-center gap-2 text-sm">
                          <Check className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { reset(); }}>
                <X className="h-3.5 w-3.5 mr-1" />Cancelar
              </Button>
              <Button size="sm" className="flex-1" onClick={() => importMut.mutate()} disabled={importMut.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />Confirmar Importação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
