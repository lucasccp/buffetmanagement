
-- Drop dependent view first
DROP VIEW IF EXISTS dashboard_metrics CASCADE;
DROP VIEW IF EXISTS eventos_por_status CASCADE;

-- Drop old tables with cascade
DROP TABLE IF EXISTS evento_cardapio CASCADE;
DROP TABLE IF EXISTS itens_cardapio CASCADE;
DROP TYPE IF EXISTS item_tipo CASCADE;

-- Recreate views without cardápio references
CREATE OR REPLACE VIEW public.dashboard_metrics AS
SELECT
  COUNT(*) AS total_eventos,
  COALESCE(SUM(f.faturamento), 0) AS faturamento_total,
  COALESCE(SUM(
    COALESCE(c.custo, 0) + COALESCE(eq.custo, 0)
  ), 0) AS custo_total,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(f.faturamento), 0) / COUNT(*) ELSE 0 END AS ticket_medio
FROM eventos e
LEFT JOIN LATERAL (SELECT COALESCE(SUM(valor_total), 0) AS faturamento FROM faturamento_evento WHERE evento_id = e.id) f ON true
LEFT JOIN LATERAL (SELECT COALESCE(SUM(valor), 0) AS custo FROM custos_evento WHERE evento_id = e.id) c ON true
LEFT JOIN LATERAL (SELECT COALESCE(SUM(valor_pago), 0) AS custo FROM evento_equipe WHERE evento_id = e.id) eq ON true;

CREATE OR REPLACE VIEW public.eventos_por_status AS
SELECT status, COUNT(*) AS total FROM eventos GROUP BY status;

-- Create cardapios table
CREATE TABLE public.cardapios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_sugerido_pp NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.cardapios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.cardapios FOR ALL USING (true) WITH CHECK (true);

-- Create cardapio_itens table
CREATE TABLE public.cardapio_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cardapio_id UUID NOT NULL REFERENCES public.cardapios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL
);
ALTER TABLE public.cardapio_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.cardapio_itens FOR ALL USING (true) WITH CHECK (true);

-- Recreate evento_cardapio linking to cardapios
CREATE TABLE public.evento_cardapio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  cardapio_id UUID NOT NULL REFERENCES public.cardapios(id) ON DELETE CASCADE
);
ALTER TABLE public.evento_cardapio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.evento_cardapio FOR ALL USING (true) WITH CHECK (true);

-- Create movimentacao_tipo enum
CREATE TYPE public.movimentacao_tipo AS ENUM ('entrada', 'saida');

-- Create caixa_movimentacoes table
CREATE TABLE public.caixa_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.movimentacao_tipo NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  nota_fiscal_url TEXT,
  automatica BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.caixa_movimentacoes FOR ALL USING (true) WITH CHECK (true);

-- Update calcular_custos_evento
CREATE OR REPLACE FUNCTION public.calcular_custos_evento(p_evento_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(valor) FROM custos_evento WHERE evento_id = p_evento_id), 0) +
    COALESCE((SELECT SUM(valor_pago) FROM evento_equipe WHERE evento_id = p_evento_id), 0)
$$;

-- Update get_financeiro_mensal
CREATE OR REPLACE FUNCTION public.get_financeiro_mensal(
  p_data_inicio DATE DEFAULT NULL, p_data_fim DATE DEFAULT NULL, p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE(mes TEXT, faturamento_mes NUMERIC, custo_mes NUMERIC, lucro_mes NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH meses AS (
    SELECT DISTINCT TO_CHAR(data_evento, 'YYYY-MM') AS mes
    FROM eventos WHERE data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR id = p_evento_id)
  ),
  fat AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(f.valor_total), 0) AS total
    FROM faturamento_evento f JOIN eventos e ON e.id = f.evento_id
    WHERE e.data_evento IS NOT NULL
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
  ),
  equip AS (
    SELECT TO_CHAR(e.data_evento, 'YYYY-MM') AS mes, COALESCE(SUM(ee.valor_pago), 0) AS total
    FROM evento_equipe ee JOIN eventos e ON e.id = ee.evento_id
    WHERE e.data_evento IS NOT NULL
      AND (p_data_inicio IS NULL OR e.data_evento >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_evento <= p_data_fim)
      AND (p_evento_id IS NULL OR e.id = p_evento_id)
    GROUP BY TO_CHAR(e.data_evento, 'YYYY-MM')
  )
  SELECT m.mes,
    COALESCE(fat.total, 0) AS faturamento_mes,
    COALESCE(cust.total, 0) + COALESCE(equip.total, 0) AS custo_mes,
    COALESCE(fat.total, 0) - (COALESCE(cust.total, 0) + COALESCE(equip.total, 0)) AS lucro_mes
  FROM meses m
  LEFT JOIN fat ON fat.mes = m.mes
  LEFT JOIN cust ON cust.mes = m.mes
  LEFT JOIN equip ON equip.mes = m.mes
  ORDER BY m.mes;
$$;

-- Update get_dashboard_filtrado
CREATE OR REPLACE FUNCTION public.get_dashboard_filtrado(
  p_data_inicio DATE DEFAULT NULL, p_data_fim DATE DEFAULT NULL, p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE(total_eventos BIGINT, faturamento_total NUMERIC, custo_total NUMERIC, ticket_medio NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
    FROM faturamento_evento f WHERE f.evento_id IN (SELECT id FROM filtered_eventos)
  ),
  costs AS (
    SELECT
      COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id IN (SELECT id FROM filtered_eventos)), 0) +
      COALESCE((SELECT SUM(ee.valor_pago) FROM evento_equipe ee WHERE ee.evento_id IN (SELECT id FROM filtered_eventos)), 0) AS total
  )
  SELECT ev_count.cnt, fat.total, costs.total,
    CASE WHEN ev_count.cnt > 0 THEN fat.total / ev_count.cnt ELSE 0 END
  FROM ev_count, fat, costs;
$$;

-- Create storage bucket for notas fiscais
INSERT INTO storage.buckets (id, name, public) VALUES ('notas-fiscais', 'notas-fiscais', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notas-fiscais');
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'notas-fiscais');
CREATE POLICY "Public delete" ON storage.objects FOR DELETE USING (bucket_id = 'notas-fiscais');
