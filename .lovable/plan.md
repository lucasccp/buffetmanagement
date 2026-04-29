## Problema

Ao clicar em "Configurações" no menu (estando logado como admin), a página redireciona para `/dashboard` em vez de abrir o formulário.

## Causa raiz

O hook `useRole` (em `src/hooks/use-role.ts`) é instanciado de forma independente em cada componente que o usa (AppSidebar, Configuracoes, EventoDetail, Usuarios). Cada instância:

1. Inicia com `isAdmin=false, loading=true`.
2. Dispara uma nova query a `user_roles` no `useEffect`.
3. Só atualiza após a resposta.

Na página `Configuracoes.tsx` o guard é:

```ts
if (roleLoading) return <AppLayout>Carregando...</AppLayout>;
if (!isAdmin) return <Navigate to="/dashboard" replace />;
```

Em alguns cenários (rede instável, segunda navegação, re-render do `AuthProvider` que dispara o `useEffect` de novo com `user` referência nova) a query retorna `null`/erro silencioso e `isAdmin` permanece `false` quando `loading` vira `false` — a rota redireciona o admin para o dashboard.

Além disso, cada página fazendo a mesma query repetida é desperdício e amplia a janela de race condition.

## Solução

Migrar `useRole` para usar **React Query** (já presente no projeto) com `queryKey` baseada no `user.id`, criando um cache compartilhado entre todas as instâncias e evitando re-execuções desnecessárias.

### Mudanças

**`src/hooks/use-role.ts`** — reescrever:

- Usar `useQuery` com `queryKey: ["user-role", user?.id]`.
- `enabled: !!user?.id`.
- `staleTime: 5 * 60 * 1000` (5 min) para evitar refetch a cada navegação.
- Retornar `{ isAdmin, loading }` mantendo a mesma API pública (sem precisar alterar quem consome).
- Logar `console.error` se a query falhar, para diagnóstico futuro.

**`src/pages/Configuracoes.tsx`** — endurecer guard:

- Continuar usando `roleLoading` para mostrar tela de carregamento.
- Substituir o `<Navigate>` imediato por uma checagem que só dispara quando `loading=false` E `isAdmin=false` (já é o caso, mas adicionar log para depurar caso volte a ocorrer).
- Garantir que `useQuery(["empresa_config"])` só execute quando `isAdmin=true` (`enabled: isAdmin`), evitando 403 silencioso por RLS.

**Nenhuma mudança de banco de dados**: as policies de `user_roles` e `empresa_config` já permitem leitura corretamente.

## Resultado esperado

- Admin clica em "Configurações" → vê brevemente "Carregando..." (ou nada, se o cache já tiver a role) → carrega o formulário de empresa.
- Não há mais redirect indevido para `/dashboard`.
- Demais páginas que usam `useRole` (AppSidebar, EventoDetail, Usuarios) continuam funcionando sem alteração de código, e ganham cache compartilhado de role (menos requisições).

## Detalhes técnicos

```ts
// src/hooks/use-role.ts (novo)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useRole() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        console.error("[useRole] erro ao buscar role:", error);
        throw error;
      }
      return !!data;
    },
  });
  return { isAdmin: !!data, loading: !!user && isLoading };
}
```
