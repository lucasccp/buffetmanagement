

# Plano: Gestão Completa de Usuários (Criar, Reset Senha, Congelar, Alterar Papel)

## Resumo
Expandir a página de Usuários com funcionalidades administrativas completas: criar usuários, resetar senha, congelar/descongelar contas e alterar papéis. Tudo via modais (padrão do projeto).

## Mudanças no Banco de Dados

### 1. Adicionar coluna `frozen` na tabela `profiles`
```sql
ALTER TABLE public.profiles ADD COLUMN frozen boolean NOT NULL DEFAULT false;
```

### 2. Criar Edge Function `admin-manage-users`
Uma edge function com o service role key para executar operações administrativas que requerem privilégios elevados:
- **Criar usuário**: `supabase.auth.admin.createUser({ email, password })`
- **Reset de senha**: `supabase.auth.admin.generateLink({ type: 'recovery', email })`  
- **Congelar/Descongelar**: `supabase.auth.admin.updateUserById(id, { ban_duration })` + atualizar `profiles.frozen`
- Verificação de role admin via `has_role` antes de executar qualquer ação

## Mudanças no Código

### 3. Criar modal `CreateUserDialog`
- Formulário com campos: email e senha
- Chama a edge function para criar o usuário
- Segue o padrão de modais do projeto (Dialog do shadcn/ui)

### 4. Atualizar `src/pages/Usuarios.tsx`
- Adicionar botão "Novo Usuário" no header (apenas admin)
- Adicionar coluna "Status" na tabela (Ativo/Congelado)
- Expandir coluna "Ações" com dropdown menu contendo:
  - **Alterar Papel** (Admin/Usuário) -- já existente, mover para dropdown
  - **Resetar Senha** -- envia email de recuperação
  - **Congelar/Descongelar** -- bloqueia/desbloqueia o acesso
- Atualizar a interface `Profile` para incluir `frozen`

### 5. Atualizar `src/hooks/use-auth.ts`
- Após login, verificar se o profile está congelado e fazer signOut com mensagem de erro

## Detalhes Técnicos

- A edge function usa `SUPABASE_SERVICE_ROLE_KEY` (já configurado como secret) para operações admin
- O congelamento usa `ban_duration` do Supabase Auth (`"876000h"` para banir, `"none"` para desbanir)
- A coluna `frozen` no profiles serve para exibição na UI e verificação client-side
- RLS: a coluna `frozen` é legível pelos mesmos policies existentes no profiles

