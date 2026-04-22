CREATE OR REPLACE FUNCTION public.get_caixa_metrics(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  entradas_realizadas numeric,
  entradas_previstas numeric,
  saidas numeric,
  saldo_atual numeric,
  saldo_futuro numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH mov AS (
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END), 0) AS saidas
    FROM caixa_movimentacoes
    WHERE (p_data_inicio IS NULL OR data >= p_data_inicio)
      AND (p_data_fim IS NULL OR data <= p_data_fim)
  ),
  prev AS (
    SELECT COALESCE(SUM(valor), 0) AS v
    FROM parcelas_pagamento
    WHERE status IN ('pendente','atrasado')
      AND (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  )
  SELECT
    mov.entradas,
    prev.v,
    mov.saidas,
    mov.entradas - mov.saidas,
    (mov.entradas + prev.v) - mov.saidas
  FROM mov, prev;
$$;