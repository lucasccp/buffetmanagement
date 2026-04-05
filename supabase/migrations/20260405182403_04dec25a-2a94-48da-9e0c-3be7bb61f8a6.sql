
-- ============================================
-- 1. Fix RLS policies on all business tables
-- Replace public ALL policies with authenticated-only
-- ============================================

-- LEADS
DROP POLICY IF EXISTS "Public access" ON public.leads;
CREATE POLICY "Authenticated access" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EVENTOS
DROP POLICY IF EXISTS "Public access" ON public.eventos;
CREATE POLICY "Authenticated access" ON public.eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EQUIPE
DROP POLICY IF EXISTS "Public access" ON public.equipe;
CREATE POLICY "Authenticated access" ON public.equipe FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CAIXA_MOVIMENTACOES
DROP POLICY IF EXISTS "Public access" ON public.caixa_movimentacoes;
CREATE POLICY "Authenticated access" ON public.caixa_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FATURAMENTO_EVENTO
DROP POLICY IF EXISTS "Public access" ON public.faturamento_evento;
CREATE POLICY "Authenticated access" ON public.faturamento_evento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PAGAMENTOS_EVENTO
DROP POLICY IF EXISTS "Public access" ON public.pagamentos_evento;
CREATE POLICY "Authenticated access" ON public.pagamentos_evento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CUSTOS_EVENTO
DROP POLICY IF EXISTS "Public access" ON public.custos_evento;
CREATE POLICY "Authenticated access" ON public.custos_evento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CARDAPIOS
DROP POLICY IF EXISTS "Public access" ON public.cardapios;
CREATE POLICY "Authenticated access" ON public.cardapios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CARDAPIO_ITENS
DROP POLICY IF EXISTS "Public access" ON public.cardapio_itens;
CREATE POLICY "Authenticated access" ON public.cardapio_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EVENTO_CARDAPIO
DROP POLICY IF EXISTS "Public access" ON public.evento_cardapio;
CREATE POLICY "Authenticated access" ON public.evento_cardapio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EVENTO_EQUIPE
DROP POLICY IF EXISTS "Public access" ON public.evento_equipe;
CREATE POLICY "Authenticated access" ON public.evento_equipe FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 2. Fix security definer views
-- Recreate dashboard views with SECURITY INVOKER
-- ============================================

CREATE OR REPLACE VIEW public.dashboard_metrics
WITH (security_invoker = true)
AS
SELECT
  COUNT(*)::bigint AS total_eventos,
  COALESCE(SUM(valor_total), 0) AS faturamento_total,
  0::numeric AS custo_total,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_total), 0) / COUNT(*) ELSE 0 END AS ticket_medio
FROM public.eventos;

CREATE OR REPLACE VIEW public.eventos_por_status
WITH (security_invoker = true)
AS
SELECT status, COUNT(*)::bigint AS total
FROM public.eventos
GROUP BY status;

-- ============================================
-- 3. Secure notas-fiscais storage bucket
-- Make private and restrict policies to authenticated
-- ============================================

UPDATE storage.buckets SET public = false WHERE id = 'notas-fiscais';

DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Public delete" ON storage.objects;

-- Also try common policy name variations
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access" ON storage.objects;

-- Create authenticated-only policies for notas-fiscais
CREATE POLICY "Authenticated read notas-fiscais"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated upload notas-fiscais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "Admin delete notas-fiscais"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notas-fiscais' AND public.has_role(auth.uid(), 'admin'));
