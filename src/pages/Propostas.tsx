import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText } from "lucide-react";
import { formatCurrency, formatDate, propostaStatusLabels } from "@/lib/formatters";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";

const statusColors: Record<string, string> = {
  enviada: "bg-info/10 text-info border-info/20",
  aceita: "bg-success/10 text-success border-success/20",
  convertida: "bg-primary/10 text-primary border-primary/20",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Propostas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas" as any)
        .select("*, leads(nome), cardapios(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return propostas;
    return propostas.filter((p) => p.leads?.nome?.toLowerCase().includes(t) || p.cardapios?.nome?.toLowerCase().includes(t));
  }, [propostas, search]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Propostas</h1>
          <Button size="sm" onClick={() => navigate("/propostas/nova")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nova Proposta
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por lead ou cardápio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Lead</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Cardápio</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Convidados</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      {propostas.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title="Nenhuma proposta ainda"
                          description="Crie a primeira proposta a partir de um lead e um cardápio."
                          actionLabel="Criar primeira proposta"
                          onAction={() => navigate("/propostas/nova")}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-12 text-sm">Nenhum resultado para "{search}"</div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/propostas/${p.id}`)}>
                      <TableCell className="font-medium text-sm">{p.leads?.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.cardapios?.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.numero_convidados ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(Number(p.valor_total ?? 0))}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[p.status]}>{propostaStatusLabels[p.status]}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDate(p.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
