
-- Remove the duplicate trigger (parcela → caixa)
-- The flow is now: parcela paga → creates pagamento_evento pago → pagamento trigger creates caixa entry
DROP TRIGGER IF EXISTS trg_parcela_paga_caixa ON public.parcelas_pagamento;
DROP FUNCTION IF EXISTS public.fn_parcela_paga_caixa();

-- Clean duplicate caixa entries: keep only the ones linked to pagamentos_evento (referencia_id pointing to pagamentos_evento)
-- Delete caixa entries that were created by the old parcela trigger (they have referencia_id matching parcelas_pagamento ids)
DELETE FROM caixa_movimentacoes
WHERE automatica = true
  AND referencia_id IN (SELECT id FROM parcelas_pagamento);
