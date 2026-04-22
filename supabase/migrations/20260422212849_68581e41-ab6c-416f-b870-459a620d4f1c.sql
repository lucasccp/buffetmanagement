
-- caixa_movimentacoes
DROP POLICY IF EXISTS "caixa_delete_admin" ON public.caixa_movimentacoes;
CREATE POLICY "caixa_delete" ON public.caixa_movimentacoes
  FOR DELETE TO authenticated USING (true);

-- cardapios
DROP POLICY IF EXISTS "cardapios_delete_admin" ON public.cardapios;
CREATE POLICY "cardapios_delete" ON public.cardapios
  FOR DELETE TO authenticated USING (true);

-- custos_evento
DROP POLICY IF EXISTS "custos_delete_admin" ON public.custos_evento;
CREATE POLICY "custos_delete" ON public.custos_evento
  FOR DELETE TO authenticated USING (true);

-- equipe
DROP POLICY IF EXISTS "equipe_delete_admin" ON public.equipe;
CREATE POLICY "equipe_delete" ON public.equipe
  FOR DELETE TO authenticated USING (true);

-- eventos
DROP POLICY IF EXISTS "eventos_delete_admin" ON public.eventos;
CREATE POLICY "eventos_delete" ON public.eventos
  FOR DELETE TO authenticated USING (true);

-- faturamento_evento
DROP POLICY IF EXISTS "faturamento_delete_admin" ON public.faturamento_evento;
CREATE POLICY "faturamento_delete" ON public.faturamento_evento
  FOR DELETE TO authenticated USING (true);

-- leads: delete + insert + update liberados
DROP POLICY IF EXISTS "leads_delete_admin" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "leads_insert_admin" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "leads_update_admin" ON public.leads;
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- pagamentos_evento
DROP POLICY IF EXISTS "Pagamentos delete admin only" ON public.pagamentos_evento;
CREATE POLICY "pagamentos_delete" ON public.pagamentos_evento
  FOR DELETE TO authenticated USING (true);

-- parcelas_pagamento
DROP POLICY IF EXISTS "Parcelas delete admin only" ON public.parcelas_pagamento;
CREATE POLICY "parcelas_delete" ON public.parcelas_pagamento
  FOR DELETE TO authenticated USING (true);
