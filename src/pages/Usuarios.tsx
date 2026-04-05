import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ShieldOff, Loader2, MoreHorizontal, UserPlus, KeyRound, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateUserDialog from "@/components/CreateUserDialog";

interface Profile {
  id: string;
  email: string | null;
  created_at: string;
  frozen: boolean;
  roles: string[];
}

export default function Usuarios() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, email, created_at, frozen");

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
      frozen: p.frozen ?? false,
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
    setActionLoading(profileId);
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
      setActionLoading(null);
    }
  };

  const resetPassword = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reset_password", email },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message);
      }
      toast.success("Link de recuperação gerado. O usuário receberá o email.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao resetar senha");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFreeze = async (profileId: string, currentlyFrozen: boolean) => {
    setActionLoading(profileId);
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "toggle_freeze", user_id: profileId, freeze: !currentlyFrozen },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message);
      }
      toast.success(currentlyFrozen ? "Usuário descongelado" : "Usuário congelado");
      await fetchProfiles();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status");
    } finally {
      setActionLoading(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Gerencie todos os usuários do sistema" : "Seus dados de acesso"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Novo Usuário
            </Button>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Status</TableHead>
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
                      <Badge variant={p.frozen ? "destructive" : "secondary"}>
                        {p.frozen ? "Congelado" : "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pIsAdmin ? "default" : "secondary"}>
                        {pIsAdmin ? "Admin" : "Usuário"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={actionLoading === p.id || actionLoading === p.email}>
                                {actionLoading === p.id || actionLoading === p.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleAdmin(p.id, pIsAdmin)}>
                                {pIsAdmin ? (
                                  <><ShieldOff className="h-4 w-4 mr-2" /> Remover Admin</>
                                ) : (
                                  <><Shield className="h-4 w-4 mr-2" /> Tornar Admin</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resetPassword(p.email!)}>
                                <KeyRound className="h-4 w-4 mr-2" /> Resetar Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleFreeze(p.id, p.frozen)}>
                                {p.frozen ? (
                                  <><Sun className="h-4 w-4 mr-2" /> Descongelar</>
                                ) : (
                                  <><Snowflake className="h-4 w-4 mr-2" /> Congelar</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchProfiles} />
    </AppLayout>
  );
}
