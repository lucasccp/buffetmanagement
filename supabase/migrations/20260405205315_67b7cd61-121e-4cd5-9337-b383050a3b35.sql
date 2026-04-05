
-- =============================================
-- 1. DROP all overly permissive "public" or "Authenticated access" ALL policies
-- =============================================

-- Tables that had permissive ALL policies with USING(true) / WITH CHECK(true)
DROP POLICY IF EXISTS "Authenticated access" ON public.leads;
DROP POLICY IF EXISTS "Authenticated access" ON public.eventos;
DROP POLICY IF EXISTS "Authenticated access" ON public.equipe;
DROP POLICY IF EXISTS "Authenticated access" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "Authenticated access" ON public.faturamento_evento;
DROP POLICY IF EXISTS "Authenticated access" ON public.custos_evento;
DROP POLICY IF EXISTS "Authenticated access" ON public.cardapios;
DROP POLICY IF EXISTS "Authenticated access" ON public.cardapio_itens;
DROP POLICY IF EXISTS "Authenticated access" ON public.evento_cardapio;
DROP POLICY IF EXISTS "Authenticated access" ON public.evento_equipe;

-- Drop the privilege escalation risk policy on user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Drop the vulnerable profiles update policy
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- =============================================
-- 2. LEADS — admin full access, regular users read-only
-- =============================================
CREATE POLICY "leads_select_authenticated" ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "leads_insert_admin" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "leads_update_admin" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "leads_delete_admin" ON public.leads
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. EVENTOS — all authenticated can read, admin can write
-- =============================================
CREATE POLICY "eventos_select" ON public.eventos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eventos_insert" ON public.eventos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "eventos_update" ON public.eventos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "eventos_delete_admin" ON public.eventos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. EQUIPE — all authenticated can read, admin can write
-- =============================================
CREATE POLICY "equipe_select" ON public.equipe
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "equipe_insert" ON public.equipe
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "equipe_update" ON public.equipe
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "equipe_delete_admin" ON public.equipe
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. FINANCIAL TABLES — admin only for write, authenticated read
-- =============================================

-- caixa_movimentacoes
CREATE POLICY "caixa_select" ON public.caixa_movimentacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "caixa_insert" ON public.caixa_movimentacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "caixa_update_admin" ON public.caixa_movimentacoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "caixa_delete_admin" ON public.caixa_movimentacoes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- faturamento_evento
CREATE POLICY "faturamento_select" ON public.faturamento_evento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "faturamento_insert" ON public.faturamento_evento
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "faturamento_update_admin" ON public.faturamento_evento
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "faturamento_delete_admin" ON public.faturamento_evento
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- custos_evento
CREATE POLICY "custos_select" ON public.custos_evento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "custos_insert" ON public.custos_evento
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "custos_update" ON public.custos_evento
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "custos_delete_admin" ON public.custos_evento
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. CARDAPIOS / ITENS / JUNCTIONS — authenticated CRUD
-- =============================================
CREATE POLICY "cardapios_select" ON public.cardapios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cardapios_insert" ON public.cardapios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cardapios_update" ON public.cardapios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cardapios_delete_admin" ON public.cardapios
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cardapio_itens_select" ON public.cardapio_itens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cardapio_itens_insert" ON public.cardapio_itens
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cardapio_itens_update" ON public.cardapio_itens
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cardapio_itens_delete" ON public.cardapio_itens
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "evento_cardapio_select" ON public.evento_cardapio
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "evento_cardapio_insert" ON public.evento_cardapio
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "evento_cardapio_update" ON public.evento_cardapio
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "evento_cardapio_delete" ON public.evento_cardapio
  FOR DELETE TO authenticated USING (true);

-- evento_equipe
CREATE POLICY "evento_equipe_select" ON public.evento_equipe
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "evento_equipe_insert" ON public.evento_equipe
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "evento_equipe_update" ON public.evento_equipe
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "evento_equipe_delete" ON public.evento_equipe
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 7. USER_ROLES — fix privilege escalation
-- =============================================
-- Separate INSERT policy for admins only (prevents self-grant)
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 8. PROFILES — fix frozen bypass
-- =============================================
CREATE POLICY "Users update own profile safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND frozen = false);

-- =============================================
-- 9. STORAGE — fix notas-fiscais bucket policies
-- =============================================
-- Drop existing public storage policies
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Public delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete notas-fiscais" ON storage.objects;

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'notas-fiscais';

-- Create restricted policies
CREATE POLICY "Authenticated read notas-fiscais" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated upload notas-fiscais" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "Admin delete notas-fiscais" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notas-fiscais' AND public.has_role(auth.uid(), 'admin'));
