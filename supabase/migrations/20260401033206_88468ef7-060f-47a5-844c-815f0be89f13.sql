
-- Function to get monthly financial data with optional filters
CREATE OR REPLACE FUNCTION public.get_financeiro_mensal(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE(
  mes TEXT,
  faturamento_mes NUMERIC,
  custo_mes NUMERIC,
  lucro_mes NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes, data_evento
    FROM eventos
    WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
  ),
  fat AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f
    JOIN eventos e ON e.id = f.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  cust AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes,
      COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c
    JOIN eventos e ON e.id = c.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  equip AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes,
      COALESCE(SUM(ee.valor_pago), 0) AS total
    FROM evento_equipe ee
    JOIN eventos e ON e.id = ee.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  card AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes,
      COALESCE(SUM(ec.quantidade * ic.custo_unitario), 0) AS total
    FROM evento_cardapio ec
    JOIN itens_cardapio ic ON ic.id = ec.item_id
    JOIN eventos e ON e.id = ec.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  )
  SELECT
    m.mes,
    COALESCE(fat.total, 0) AS faturamento_mes,
    COALESCE(cust.total, 0) + COALESCE(equip.total, 0) + COALESCE(card.total, 0) AS custo_mes,
    COALESCE(fat.total, 0) - (COALESCE(cust.total, 0) + COALESCE(equip.total, 0) + COALESCE(card.total, 0)) AS lucro_mes
  FROM meses m
  LEFT JOIN fat ON fat.mes = m.mes
  LEFT JOIN cust ON cust.mes = m.mes
  LEFT JOIN equip ON equip.mes = m.mes
  LEFT JOIN card ON card.mes = m.mes
  ORDER BY m.mes;
$$;

-- Function to get filtered dashboard metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_filtrado(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_eventos BIGINT,
  faturamento_total NUMERIC,
  custo_total NUMERIC,
  ticket_medio NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_eventos AS (
    SELECT id FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
  ),
  ev_count AS (SELECT COUNT(*) AS cnt FROM filtered_eventos),
  fat AS (
    SELECT COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f
    WHERE f.evento_id IN (SELECT id FROM filtered_eventos)
  ),
  costs AS (
    SELECT
      COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id IN (SELECT id FROM filtered_eventos)), 0) +
      COALESCE((SELECT SUM(ee.valor_pago) FROM evento_equipe ee WHERE ee.evento_id IN (SELECT id FROM filtered_eventos)), 0) +
      COALESCE((SELECT SUM(ec.quantidade * ic.custo_unitario) FROM evento_cardapio ec JOIN itens_cardapio ic ON ic.id = ec.item_id WHERE ec.evento_id IN (SELECT id FROM filtered_eventos)), 0) AS total
  )
  SELECT
    ev_count.cnt AS total_eventos,
    fat.total AS faturamento_total,
    costs.total AS custo_total,
    CASE WHEN ev_count.cnt > 0 THEN fat.total / ev_count.cnt ELSE 0 END AS ticket_medio
  FROM ev_count, fat, costs;
$$;
