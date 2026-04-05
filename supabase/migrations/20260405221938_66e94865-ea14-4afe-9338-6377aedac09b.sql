-- Fix get_dashboard_executivo to use eventos.valor_total as faturamento source
CREATE OR REPLACE FUNCTION public.get_dashboard_executivo(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL,
  p_tipo_evento text DEFAULT NULL
)
RETURNS TABLE(total_eventos bigint, faturamento_total numeric, custo_total numeric, lucro_total numeric, margem_media numeric, ticket_medio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT id, COALESCE(valor_total, 0) AS valor_total FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  ev_count AS (SELECT COUNT(*) AS cnt FROM filtered),
  fat AS (SELECT COALESCE(SUM(valor_total), 0) AS total FROM filtered),
  costs AS (
    SELECT COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c WHERE c.evento_id IN (SELECT id FROM filtered)
  )
  SELECT
    ev_count.cnt,
    fat.total,
    costs.total,
    fat.total - costs.total,
    CASE WHEN fat.total > 0 THEN ROUND(((fat.total - costs.total) / fat.total) * 100, 1) ELSE 0 END,
    CASE WHEN ev_count.cnt > 0 THEN ROUND(fat.total / ev_count.cnt, 2) ELSE 0 END
  FROM ev_count, fat, costs;
$$;

-- Fix get_executivo_mensal to use eventos.valor_total
CREATE OR REPLACE FUNCTION public.get_executivo_mensal(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL,
  p_tipo_evento text DEFAULT NULL
)
RETURNS TABLE(mes text, faturamento_mes numeric, custo_mes numeric, lucro_mes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT id, data_evento, COALESCE(valor_total, 0) AS valor_total FROM eventos
    WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  fat AS (
    SELECT TO_CHAR(data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(valor_total), 0) AS total
    FROM filtered
    GROUP BY TO_CHAR(data_evento, 'YYYY-MM')
  ),
  cust AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c JOIN filtered e ON e.id = c.evento_id
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes FROM filtered
  )
  SELECT m.mes,
    COALESCE(fat.total, 0),
    COALESCE(cust.total, 0),
    COALESCE(fat.total, 0) - COALESCE(cust.total, 0)
  FROM meses m
  LEFT JOIN fat ON fat.mes = m.mes
  LEFT JOIN cust ON cust.mes = m.mes
  ORDER BY m.mes;
$$;

-- Fix get_eventos_ranking to use eventos.valor_total
CREATE OR REPLACE FUNCTION public.get_eventos_ranking(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(evento_id uuid, nome_evento text, data_evento date, faturamento numeric, custo numeric, lucro numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    e.id,
    e.nome_evento,
    e.data_evento,
    COALESCE(e.valor_total, 0) AS faturamento,
    COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id = e.id), 0) AS custo,
    COALESCE(e.valor_total, 0) - COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id = e.id), 0) AS lucro
  FROM eventos e
  WHERE (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
    AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
  ORDER BY faturamento DESC
  LIMIT p_limit;
$$;

-- Fix get_financeiro_metrics to use eventos.valor_total
CREATE OR REPLACE FUNCTION public.get_financeiro_metrics(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(total_recebido numeric, total_a_receber numeric, total_atrasado numeric, faturamento_total numeric, taxa_inadimplencia numeric, eventos_com_pendencia bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH parcelas AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) AS recebido,
      COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) AS a_receber,
      COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0) AS atrasado,
      COUNT(DISTINCT CASE WHEN status IN ('pendente', 'atrasado') THEN evento_id END) AS ev_pend
    FROM parcelas_pagamento
    WHERE (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  ),
  fat AS (
    SELECT COALESCE(SUM(valor_total), 0) AS total
    FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
  )
  SELECT
    parcelas.recebido,
    parcelas.a_receber,
    parcelas.atrasado,
    fat.total,
    CASE WHEN fat.total > 0 THEN ROUND((parcelas.atrasado / fat.total) * 100, 1) ELSE 0 END,
    parcelas.ev_pend
  FROM parcelas, fat;
$$;