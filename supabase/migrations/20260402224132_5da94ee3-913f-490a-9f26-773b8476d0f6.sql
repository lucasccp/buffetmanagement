
-- New enum for pagamento status
CREATE TYPE public.pagamento_evento_status AS ENUM ('planejado', 'pago');

-- New enum for metodo de pagamento
CREATE TYPE public.metodo_pagamento AS ENUM ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro');

-- Create pagamentos_evento table
CREATE TABLE public.pagamentos_evento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_planejada DATE NOT NULL,
  data_pagamento DATE,
  metodo_pagamento public.metodo_pagamento NOT NULL DEFAULT 'pix',
  status public.pagamento_evento_status NOT NULL DEFAULT 'planejado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos_evento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.pagamentos_evento FOR ALL TO public USING (true) WITH CHECK (true);

-- Trigger: when pagamento status changes to 'pago', create entrada in caixa
CREATE OR REPLACE FUNCTION public.fn_pagamento_pago_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  IF NEW.status = 'pago' AND (OLD IS NULL OR OLD.status <> 'pago') THEN
    SELECT nome_evento INTO v_nome FROM eventos WHERE id = NEW.evento_id;
    INSERT INTO caixa_movimentacoes (tipo, descricao, valor, data, evento_id, automatica)
    VALUES ('entrada', 'Pagamento recebido - ' || COALESCE(v_nome, ''), NEW.valor, COALESCE(NEW.data_pagamento, CURRENT_DATE), NEW.evento_id, true);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pagamento_pago_caixa
AFTER INSERT OR UPDATE ON public.pagamentos_evento
FOR EACH ROW EXECUTE FUNCTION public.fn_pagamento_pago_caixa();

-- Trigger: when custo is created, create saída in caixa
CREATE OR REPLACE FUNCTION public.fn_custo_evento_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  SELECT nome_evento INTO v_nome FROM eventos WHERE id = NEW.evento_id;
  INSERT INTO caixa_movimentacoes (tipo, descricao, valor, data, evento_id, automatica)
  VALUES ('saida', 'Custo: ' || NEW.descricao || ' - ' || COALESCE(v_nome, ''), NEW.valor, COALESCE(NEW.data_custo, CURRENT_DATE), NEW.evento_id, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custo_evento_caixa
AFTER INSERT ON public.custos_evento
FOR EACH ROW EXECUTE FUNCTION public.fn_custo_evento_caixa();

-- Update dashboard functions to use pagamentos_evento instead of faturamento_evento
CREATE OR REPLACE FUNCTION public.get_dashboard_filtrado(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_evento_id uuid DEFAULT NULL::uuid)
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
    SELECT
      COALESCE((SELECT SUM(c.valor) FROM custos_evento c WHERE c.evento_id IN (SELECT id FROM filtered_eventos)), 0) +
      COALESCE((SELECT SUM(ee.valor_pago) FROM evento_equipe ee WHERE ee.evento_id IN (SELECT id FROM filtered_eventos)), 0) AS total
  )
  SELECT ev_count.cnt, fat.total, costs.total,
    CASE WHEN ev_count.cnt > 0 THEN fat.total / ev_count.cnt ELSE 0 END
  FROM ev_count, fat, costs;
$$;

CREATE OR REPLACE FUNCTION public.get_financeiro_mensal(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_evento_id uuid DEFAULT NULL::uuid)
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
