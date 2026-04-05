
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_eventos_data_evento ON eventos(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_evento ON eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas_pagamento(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas_pagamento(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_evento_id ON parcelas_pagamento(evento_id);
CREATE INDEX IF NOT EXISTS idx_custos_evento_id ON custos_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_caixa_data ON caixa_movimentacoes(data);
CREATE INDEX IF NOT EXISTS idx_caixa_tipo ON caixa_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_caixa_evento_id ON caixa_movimentacoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_evento_id ON faturamento_evento(evento_id);

-- 1. Executive dashboard metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_executivo(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL,
  p_tipo_evento text DEFAULT NULL
)
RETURNS TABLE(
  total_eventos bigint,
  faturamento_total numeric,
  custo_total numeric,
  lucro_total numeric,
  margem_media numeric,
  ticket_medio numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT id FROM eventos
    WHERE (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  ev_count AS (SELECT COUNT(*) AS cnt FROM filtered),
  fat AS (
    SELECT COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f WHERE f.evento_id IN (SELECT id FROM filtered)
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
$$;

-- 2. Executive monthly data
CREATE OR REPLACE FUNCTION public.get_executivo_mensal(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL,
  p_tipo_evento text DEFAULT NULL
)
RETURNS TABLE(mes text, faturamento_mes numeric, custo_mes numeric, lucro_mes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes
    FROM eventos WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
      AND (p_tipo_evento IS NULL OR tipo_evento = p_tipo_evento)
  ),
  fat AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f JOIN eventos e ON e.id = f.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
      AND (p_tipo_evento IS NULL OR e.tipo_evento = p_tipo_evento)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  ),
  cust AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(c.valor), 0) AS total
    FROM custos_evento c JOIN eventos e ON e.id = c.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
      AND (p_tipo_evento IS NULL OR e.tipo_evento = p_tipo_evento)
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
$$;

-- 3. Caixa metrics
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH ent_real AS (
    SELECT COALESCE(SUM(valor), 0) AS v FROM parcelas_pagamento
    WHERE status = 'pago'
      AND (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  ),
  ent_prev AS (
    SELECT COALESCE(SUM(valor), 0) AS v FROM parcelas_pagamento
    WHERE status = 'pendente'
      AND (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  ),
  said AS (
    SELECT COALESCE(SUM(valor), 0) AS v FROM custos_evento
    WHERE (p_data_inicio IS NULL OR data_custo >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_custo <= p_data_fim)
  )
  SELECT
    ent_real.v,
    ent_prev.v,
    said.v,
    ent_real.v - said.v,
    (ent_real.v + ent_prev.v) - said.v
  FROM ent_real, ent_prev, said;
$$;

-- 4. Caixa monthly flow
CREATE OR REPLACE FUNCTION public.get_caixa_fluxo_mensal(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(mes text, entradas numeric, saidas numeric, saldo numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    TO_CHAR(data, 'YYYY-MM') AS mes,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
  FROM caixa_movimentacoes
  WHERE (p_data_inicio IS NULL OR data >= p_data_inicio)
    AND (p_data_fim IS NULL OR data <= p_data_fim)
  GROUP BY TO_CHAR(data, 'YYYY-MM')
  ORDER BY mes;
$$;

-- 5. Caixa cumulative balance
CREATE OR REPLACE FUNCTION public.get_caixa_saldo_acumulado(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(mes text, saldo_acumulado numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT mes, SUM(saldo) OVER (ORDER BY mes) AS saldo_acumulado
  FROM (
    SELECT
      TO_CHAR(data, 'YYYY-MM') AS mes,
      SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) AS saldo
    FROM caixa_movimentacoes
    WHERE (p_data_inicio IS NULL OR data >= p_data_inicio)
      AND (p_data_fim IS NULL OR data <= p_data_fim)
    GROUP BY TO_CHAR(data, 'YYYY-MM')
  ) sub
  ORDER BY mes;
$$;

-- 6. Events ranking by revenue
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
    COALESCE(SUM(f.valor_total), 0) AS faturamento,
    COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id = e.id), 0) AS custo,
    COALESCE(SUM(f.valor_total), 0) - COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id = e.id), 0) AS lucro
  FROM eventos e
  LEFT JOIN faturamento_evento f ON f.evento_id = e.id
  WHERE (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
    AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
  GROUP BY e.id, e.nome_evento, e.data_evento
  ORDER BY faturamento DESC
  LIMIT p_limit;
$$;

-- 7. Parcelas distribution by status
CREATE OR REPLACE FUNCTION public.get_parcelas_distribuicao(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(status text, total bigint, valor numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    status::text,
    COUNT(*),
    COALESCE(SUM(valor), 0)
  FROM parcelas_pagamento
  WHERE (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  GROUP BY status;
$$;

-- 8. Financeiro metrics with taxa_inadimplencia
CREATE OR REPLACE FUNCTION public.get_financeiro_metrics(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  total_recebido numeric,
  total_a_receber numeric,
  total_atrasado numeric,
  faturamento_total numeric,
  taxa_inadimplencia numeric,
  eventos_com_pendencia bigint
)
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
    SELECT COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f
    JOIN eventos e ON e.id = f.evento_id
    WHERE (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
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
