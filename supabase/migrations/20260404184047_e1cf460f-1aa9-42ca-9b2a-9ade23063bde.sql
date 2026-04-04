
CREATE OR REPLACE FUNCTION public.calcular_custos_evento(p_evento_id uuid)
  RETURNS numeric
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(valor), 0) FROM custos_evento WHERE evento_id = p_evento_id
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_filtrado(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL
)
  RETURNS TABLE(total_eventos bigint, faturamento_total numeric, custo_total numeric, ticket_medio numeric)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  WITH filtered_eventos AS (
    SELECT id FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
  ),
  ev_count AS (SELECT COUNT(*) AS cnt FROM filtered_eventos),
  fat AS (
    SELECT COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos_evento p WHERE p.evento_id IN (SELECT id FROM filtered_eventos) AND p.status = 'pago'
  ),
  costs AS (
    SELECT COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c WHERE c.evento_id IN (SELECT id FROM filtered_eventos)
  )
  SELECT ev_count.cnt, fat.total, costs.total,
    CASE WHEN ev_count.cnt > 0 THEN fat.total / ev_count.cnt ELSE 0 END
  FROM ev_count, fat, costs;
$$;

CREATE OR REPLACE FUNCTION public.get_financeiro_mensal(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL
)
  RETURNS TABLE(mes text, faturamento_mes numeric, custo_mes numeric, lucro_mes numeric)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  WITH meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes
    FROM eventos WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
  ),
  fat AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos_evento p JOIN eventos e ON e.id = p.evento_id
    WHERE p.status = 'pago' AND e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  cust AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c JOIN eventos e ON e.id = c.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  )
  SELECT m.mes,
    COALESCE(fat.total, 0) AS faturamento_mes,
    COALESCE(cust.total, 0) AS custo_mes,
    COALESCE(fat.total, 0) - COALESCE(cust.total, 0) AS lucro_mes
  FROM meses m
  LEFT JOIN fat ON fat.mes = m.mes
  LEFT JOIN cust ON cust.mes = m.mes
  ORDER BY m.mes;
$$;
