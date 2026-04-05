
CREATE OR REPLACE FUNCTION public.get_ai_financial_snapshot()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  WITH fat AS (
    SELECT COALESCE(SUM(valor_total), 0) AS total FROM eventos
  ),
  parcelas_agg AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) AS recebido,
      COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) AS a_receber,
      COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0) AS atrasado
    FROM parcelas_pagamento
  ),
  custos AS (
    SELECT COALESCE(SUM(valor), 0) AS total FROM custos_evento
  ),
  caixa_agg AS (
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS saidas
    FROM caixa_movimentacoes
  ),
  ev_count AS (
    SELECT COUNT(*) AS total FROM eventos
  ),
  fluxo AS (
    SELECT json_agg(row_to_json(sub)) AS data FROM (
      SELECT
        TO_CHAR(data, 'YYYY-MM') AS mes,
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS saidas
      FROM caixa_movimentacoes
      GROUP BY TO_CHAR(data, 'YYYY-MM')
      ORDER BY mes
    ) sub
  ),
  prejuizo AS (
    SELECT json_agg(row_to_json(sub)) AS data FROM (
      SELECT
        e.id,
        e.nome_evento,
        e.data_evento,
        COALESCE(e.valor_total, 0) AS valor_contratado,
        COALESCE(c.total_custo, 0) AS custo,
        COALESCE(e.valor_total, 0) - COALESCE(c.total_custo, 0) AS lucro
      FROM eventos e
      LEFT JOIN (
        SELECT evento_id, SUM(valor) AS total_custo FROM custos_evento GROUP BY evento_id
      ) c ON c.evento_id = e.id
      WHERE COALESCE(e.valor_total, 0) - COALESCE(c.total_custo, 0) < 0
      ORDER BY lucro ASC
      LIMIT 10
    ) sub
  )
  SELECT json_build_object(
    'faturamento_total', fat.total,
    'recebido', parcelas_agg.recebido,
    'a_receber', parcelas_agg.a_receber,
    'atrasado', parcelas_agg.atrasado,
    'custos', custos.total,
    'entradas', caixa_agg.entradas,
    'saidas', caixa_agg.saidas,
    'saldo_atual', caixa_agg.entradas - caixa_agg.saidas,
    'saldo_futuro', (caixa_agg.entradas + parcelas_agg.a_receber) - caixa_agg.saidas,
    'lucro', fat.total - custos.total,
    'margem', CASE WHEN fat.total > 0 THEN ROUND(((fat.total - custos.total) / fat.total) * 100, 1) ELSE 0 END,
    'eventos', ev_count.total,
    'fluxo_caixa', COALESCE(fluxo.data, '[]'::json),
    'eventos_prejuizo', COALESCE(prejuizo.data, '[]'::json)
  ) INTO v_result
  FROM fat, parcelas_agg, custos, caixa_agg, ev_count, fluxo, prejuizo;

  RETURN v_result;
END;
$function$;
