import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Loader2, Pencil, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { parsePdfCardapio, type ParsedCardapio, type ParsedItem } from "@/lib/parsePdfCardapio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EditingTarget = { catIdx: number; itemIdx: number } | null;
type ParsedCategory = ParsedCardapio["categorias"][number];

const tipoBadgeColors: Record<string, string> = {
  comida: "bg-primary/10 text-primary border-primary/20",
  bebida: "bg-info/10 text-info border-info/20",
  sobremesa: "bg-warning/10 text-warning border-warning/20",
};

const tipoLabels: Record<ParsedItem["tipo"], string> = {
  comida: "Comida",
  bebida: "Bebida",
  sobremesa: "Sobremesa",
};

interface PreviewItemRowProps {
  item: ParsedItem;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}

function PreviewItemRow({
  item,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: PreviewItemRowProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="h-9"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancelar edição
            </Button>
            <Button type="button" size="sm" onClick={onSaveEdit}>
              <Check className="mr-1 h-3.5 w-3.5" />Salvar item
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-5 break-words">{item.nome}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline" className={`text-xs ${tipoBadgeColors[item.tipo] ?? ""}`}>
              {tipoLabels[item.tipo] ?? item.tipo}
            </Badge>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onStartEdit} aria-label={`Editar ${item.nome}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive"
              onClick={onRemove}
              aria-label={`Remover ${item.nome}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PreviewCategorySectionProps {
  category: ParsedCategory;
  categoryIndex: number;
  editingItem: EditingTarget;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: (categoryIndex: number, itemIndex: number, itemName: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemoveItem: (categoryIndex: number, itemIndex: number) => void;
}

function PreviewCategorySection({
  category,
  categoryIndex,
  editingItem,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemoveItem,
}: PreviewCategorySectionProps) {
  return (
    <section className="rounded-xl border bg-muted/15 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {category.nome}
          </Badge>
          <span className="text-xs text-muted-foreground">{category.itens.length} itens</span>
        </div>
      </div>

      <div className="space-y-2">
        {category.itens.map((item, itemIndex) => {
          const isEditing = editingItem?.catIdx === categoryIndex && editingItem?.itemIdx === itemIndex;

          return (
            <PreviewItemRow
              key={`${category.nome}-${item.nome}-${itemIndex}`}
              item={item}
              isEditing={isEditing}
              editValue={editValue}
              onEditValueChange={onEditValueChange}
              onStartEdit={() => onStartEdit(categoryIndex, itemIndex, item.nome)}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onRemove={() => onRemoveItem(categoryIndex, itemIndex)}
            />
          );
        })}
      </div>
    </section>
  );
}

export function ImportCardapioDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedCardapio | null>(null);
  const [cardapioName, setCardapioName] = useState("");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<EditingTarget>(null);
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
      const extractedItems = result.categorias.reduce((sum, category) => sum + category.itens.length, 0);

      if (extractedItems === 0) {
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

  const startEditItem = (catIdx: number, itemIdx: number, value: string) => {
    setEditingItem({ catIdx, itemIdx });
    setEditValue(value);
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    if (!parsed) return;

    const updated = {
      ...parsed,
      categorias: parsed.categorias
        .map((category, categoryIndex) => {
          if (categoryIndex !== catIdx) return category;

          return {
            ...category,
            itens: category.itens.filter((_, currentItemIndex) => currentItemIndex !== itemIdx),
          };
        })
        .filter((category) => category.itens.length > 0),
    };

    setParsed(updated);
  };

  const saveEditItem = () => {
    if (!parsed || !editingItem || !editValue.trim()) return;

    const updated = {
      ...parsed,
      categorias: parsed.categorias.map((category, categoryIndex) => {
        if (categoryIndex !== editingItem.catIdx) return category;

        return {
          ...category,
          itens: category.itens.map((item, itemIndex) => {
            if (itemIndex !== editingItem.itemIdx) return item;
            return { ...item, nome: editValue.trim() };
          }),
        };
      }),
    };

    setParsed(updated);
    cancelEditItem();
  };

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed) return;

      const allItems = parsed.categorias.flatMap((category) =>
        category.itens.map((item) => ({ ...item, categoria: category.nome })),
      );
      const { data, error } = await supabase
        .from("cardapios")
        .insert({ nome: cardapioName || parsed.nome_cardapio, valor_sugerido_pp: 0 })
        .select()
        .single();

      if (error) throw error;

      if (allItems.length > 0) {
        const { error: insertError } = await supabase
          .from("cardapio_itens")
          .insert(allItems.map((item) => ({ cardapio_id: data.id, nome: item.nome, categoria: item.categoria })));

        if (insertError) throw insertError;
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

  const totalItems = parsed?.categorias.reduce((sum, category) => sum + category.itens.length, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent
        className={`flex flex-col gap-0 overflow-hidden p-0 ${
          step === "preview"
            ? "h-[min(90vh,820px)] w-[calc(100vw-2rem)] max-w-5xl"
            : "w-[calc(100vw-2rem)] max-w-xl"
        }`}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-left">
            {step === "upload" ? (
              <>Importar Cardápio via PDF</>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" />
                Resultado da IA
              </>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {step === "upload"
              ? "Envie um PDF e a IA vai estruturar categorias e itens automaticamente."
              : "Revise as informações, ajuste os itens necessários e confirme a importação."}
          </p>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 px-6 py-6">
            <button
              type="button"
              className="w-full rounded-xl border-2 border-dashed bg-muted/20 p-8 text-center transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-80"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Processando com IA...</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Analisando categorias e itens do cardápio</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo PDF</p>
                  <p className="text-xs text-muted-foreground">A IA interpretará automaticamente o conteúdo</p>
                </div>
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {step === "preview" && parsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b bg-muted/15 px-6 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <div className="space-y-2">
                  <Label className="text-xs">Nome do Cardápio</Label>
                  <Input value={cardapioName} onChange={(e) => setCardapioName(e.target.value)} />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground xl:justify-end">
                  <Badge variant="secondary" className="text-xs">
                    {parsed.categorias.length} categoria(s)
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {totalItems} item(ns)
                  </Badge>
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Confira todo o conteúdo antes de salvar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 px-6 py-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="flex flex-col gap-4 rounded-xl border bg-muted/15 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Resumo da leitura</p>
                  <p className="text-sm text-muted-foreground">
                    A IA organizou o PDF em categorias para facilitar sua revisão antes da importação.
                  </p>
                </div>

                <div className="space-y-2">
                  {parsed.categorias.map((category, index) => (
                    <div key={`${category.nome}-${index}`} className="rounded-lg border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium break-words">{category.nome}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {category.itens.length}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                  Use os botões de editar e remover para ajustar o resultado sem perder o restante do conteúdo.
                </div>
              </aside>

              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
                <div className="shrink-0 border-b px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Itens identificados</p>
                      <p className="text-xs text-muted-foreground">Toda a área abaixo é rolável para revisão completa.</p>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      Revise antes de importar
                    </Badge>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <div className="space-y-4 pr-1">
                    {parsed.categorias.map((category, categoryIndex) => (
                      <PreviewCategorySection
                        key={`${category.nome}-${categoryIndex}`}
                        category={category}
                        categoryIndex={categoryIndex}
                        editingItem={editingItem}
                        editValue={editValue}
                        onEditValueChange={setEditValue}
                        onStartEdit={startEditItem}
                        onCancelEdit={cancelEditItem}
                        onSaveEdit={saveEditItem}
                        onRemoveItem={removeItem}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" size="sm" className="sm:min-w-[160px]" onClick={reset}>
                  <X className="mr-1 h-3.5 w-3.5" />Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="sm:min-w-[220px]"
                  onClick={() => importMut.mutate()}
                  disabled={importMut.isPending || totalItems === 0}
                >
                  {importMut.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  )}
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
