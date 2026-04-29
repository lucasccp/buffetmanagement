import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, Save, Image as ImageIcon } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Navigate } from "react-router-dom";

export default function Configuracoes() {
  const qc = useQueryClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const [form, setForm] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["empresa_config"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa_config" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const saveMut = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("empresa_config" as any)
          .update({
            nome: values.nome,
            telefone: values.telefone || null,
            endereco: values.endereco || null,
            email: values.email || null,
            cnpj: values.cnpj || null,
            forma_pagamento_padrao: values.forma_pagamento_padrao || null,
            cor_destaque: values.cor_destaque || "#F4B942",
            logo_url: values.logo_url || null,
          })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empresa_config" as any).insert({
          nome: values.nome,
          telefone: values.telefone || null,
          endereco: values.endereco || null,
          email: values.email || null,
          cnpj: values.cnpj || null,
          forma_pagamento_padrao: values.forma_pagamento_padrao || null,
          cor_destaque: values.cor_destaque || "#F4B942",
          logo_url: values.logo_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresa_config"] });
      toast.success("Configurações salvas!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      setForm({ ...form, logo_url: pub.publicUrl });
      toast.success("Logo enviado! Clique em Salvar para confirmar.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading) return <AppLayout><div className="p-6 text-sm text-muted-foreground">Carregando...</div></AppLayout>;
  if (!roleLoading && !isAdmin) {
    console.warn("[Configuracoes] usuário sem permissão de admin, redirecionando");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configurações da Empresa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esses dados aparecem no cabeçalho e rodapé das propostas em PDF.
          </p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}
            className="space-y-4"
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label className="text-xs">Logotipo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        id="logo-upload"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("logo-upload")?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">{uploading ? "Enviando..." : "Enviar logo"}</span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground mt-1.5">PNG ou JPG, fundo transparente recomendado.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Nome da empresa *</Label>
                  <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">CNPJ</Label>
                    <Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Cor de destaque (PDF)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="color"
                        value={form.cor_destaque ?? "#F4B942"}
                        onChange={(e) => setForm({ ...form, cor_destaque: e.target.value })}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={form.cor_destaque ?? "#F4B942"}
                        onChange={(e) => setForm({ ...form, cor_destaque: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Forma de pagamento padrão</Label>
                  <Textarea
                    value={form.forma_pagamento_padrao ?? ""}
                    onChange={(e) => setForm({ ...form, forma_pagamento_padrao: e.target.value })}
                    className="mt-1"
                    rows={2}
                    placeholder="Ex: À vista com 5% de desconto ou em até 3x no cartão"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveMut.isPending} size="sm">
                {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Salvar configurações</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
