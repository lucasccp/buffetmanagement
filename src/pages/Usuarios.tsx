import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Profile {
  id: string;
  email: string | null;
  created_at: string;
  roles: string[];
}

export default function Usuarios() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, email, created_at");

    if (error) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const merged = (profilesData || []).map((p) => ({
      ...p,
      roles: (rolesData || [])
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role),
    }));

    setProfiles(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading) fetchProfiles();
  }, [roleLoading]);

  const toggleAdmin = async (profileId: string, currentlyAdmin: boolean) => {
    setToggling(profileId);
    try {
      if (currentlyAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", profileId)
          .eq("role", "admin");
        if (error) throw error;
        toast.success("Permissão de admin removida");
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: profileId, role: "admin" });
        if (error) throw error;
        toast.success("Usuário promovido a admin");
      }
      await fetchProfiles();
    } catch {
      toast.error("Erro ao alterar permissão");
    } finally {
      setToggling(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gerencie todos os usuários do sistema" : "Seus dados de acesso"}
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Papel</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const pIsAdmin = p.roles.includes("admin");
                const isSelf = p.id === user?.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email || "—"}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={pIsAdmin ? "default" : "secondary"}>
                        {pIsAdmin ? "Admin" : "Usuário"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant={pIsAdmin ? "outline" : "default"}
                            disabled={toggling === p.id}
                            onClick={() => toggleAdmin(p.id, pIsAdmin)}
                          >
                            {toggling === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : pIsAdmin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Remover Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Tornar Admin
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
