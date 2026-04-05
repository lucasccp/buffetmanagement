

# Plano: Página de Administração de Usuários com Controle de Acesso

## Resumo
Criar um sistema de roles (admin/user), uma tabela de profiles, e uma página de administração onde admins veem todos os usuários e usuários comuns veem apenas seu próprio registro.

## Mudanças no Banco de Dados (3 migrações)

### 1. Criar enum `app_role` e tabela `user_roles`
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 2. Criar função `has_role` (security definer) e policies
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins veem todas as roles, usuários veem apenas as suas
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
```

### 3. Criar tabela `profiles` com trigger automático
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admins veem todos, usuários veem apenas o seu
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger: criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Mudanças no Código

### 4. Criar hook `src/hooks/use-role.ts`
- Consulta `user_roles` para verificar se o usuário logado tem role `admin`
- Exporta `{ isAdmin, loading }`

### 5. Criar `src/components/AdminRoute.tsx`
- Wrapper similar ao `ProtectedRoute`, mas verifica `isAdmin`
- Redireciona para `/dashboard` se não for admin

### 6. Criar `src/pages/Usuarios.tsx`
- Se admin: lista todos os profiles (email, data de criação, role)
- Se usuário comum: mostra apenas seu próprio registro
- Admins podem promover/rebaixar usuários (adicionar/remover role admin)
- Usa a mesma estética das outras páginas (AppLayout)

### 7. Atualizar `src/App.tsx`
- Adicionar rota `/usuarios` protegida com `ProtectedRoute`

### 8. Atualizar `src/components/AppLayout.tsx`
- Adicionar item "Usuários" na sidebar (visível para todos, mas com conteúdo filtrado por role)

## Nota sobre o primeiro admin
Após a migração, será necessário inserir manualmente o primeiro admin na tabela `user_roles` usando o ID do usuário desejado.

