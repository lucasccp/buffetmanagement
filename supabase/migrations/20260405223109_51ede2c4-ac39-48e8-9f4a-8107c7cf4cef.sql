
CREATE OR REPLACE FUNCTION public.get_dashboard_executivo(
  p_data_inicio date DEFAULT NULL::date,
  p_data_fim date DEFAULT NULL::date,
  p_evento_id uuid DEFAULT NULL::uuid,
  p_tipo_evento text DEFAULT NULL::text
)
RETURNS TABLE(total_eventos bigint, faturamento_total numeric, custo_total numeric, lucro_total numeric, margem_media numeric, ticket_medio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT id FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  ev_count AS (SELECT COUNT(*) AS cnt FROM filtered),
  fat AS (
    SELECT COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos_evento p
    WHERE p.evento_id IN (SELECT id FROM filtered)
      AND p.status = 'pago'
  ),
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
$function$;

CREATE OR REPLACE FUNCTION public.get_executivo_mensal(
  p_data_inicio date DEFAULT NULL::date,
  p_data_fim date DEFAULT NULL::date,
  p_evento_id uuid DEFAULT NULL::uuid,
  p_tipo_evento text DEFAULT NULL::text
)
RETURNS TABLE(mes text, faturamento_mes numeric, custo_mes numeric, lucro_mes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT id, data_evento FROM eventos
    WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes FROM filtered
  ),
  fat AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos_evento p
    JOIN filtered e ON e.id = p.evento_id
    WHERE p.status = 'pago'
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  cust AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c JOIN filtered e ON e.id = c.evento_id
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  )
  SELECT m.mes,
    COALESCE(fat.total, 0),
    COALESCE(cust.total, 0),
    COALESCE(fat.total, 0) - COALESCE(cust.total, 0)
  FROM meses m
  LEFT JOIN fat ON fat.mes = m.mes
  LEFT JOIN cust ON cust.mes = m.mes
  ORDER BY m.mes;
$function$;
