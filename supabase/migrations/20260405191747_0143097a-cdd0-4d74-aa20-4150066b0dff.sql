
-- 1. Create enum for parcela status
CREATE TYPE public.parcela_status AS ENUM ('pendente', 'pago', 'atrasado');

-- 2. Create parcelas_pagamento table
CREATE TABLE public.parcelas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status public.parcela_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create index on evento_id for performance
CREATE INDEX idx_parcelas_pagamento_evento_id ON public.parcelas_pagamento(evento_id);
CREATE INDEX idx_parcelas_pagamento_status ON public.parcelas_pagamento(status);

-- 4. Enable RLS
ALTER TABLE public.parcelas_pagamento ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: authenticated users can do everything
CREATE POLICY "Authenticated access" ON public.parcelas_pagamento
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Function to generate installments for an event
CREATE OR REPLACE FUNCTION public.gerar_parcelas(
  p_evento_id UUID,
  p_valor_total NUMERIC,
  p_num_parcelas INTEGER,
  p_data_inicial DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_parcela NUMERIC;
  v_resto NUMERIC;
  i INTEGER;
BEGIN
  -- Validate: no existing parcelas for this event
  IF EXISTS (SELECT 1 FROM parcelas_pagamento WHERE evento_id = p_evento_id) THEN
    RAISE EXCEPTION 'Já existem parcelas para este evento. Exclua as existentes antes de gerar novas.';
  END IF;

  v_valor_parcela := TRUNC(p_valor_total / p_num_parcelas, 2);
  v_resto := p_valor_total - (v_valor_parcela * p_num_parcelas);

  FOR i IN 1..p_num_parcelas LOOP
    INSERT INTO parcelas_pagamento (evento_id, numero_parcela, valor, data_vencimento, status)
    VALUES (
      p_evento_id,
      i,
      CASE WHEN i = p_num_parcelas THEN v_valor_parcela + v_resto ELSE v_valor_parcela END,
      p_data_inicial + ((i - 1) * INTERVAL '1 month')::INTEGER,
      'pendente'
    );
  END LOOP;
END;
$$;

-- 7. Function to get parcelas summary per event
CREATE OR REPLACE FUNCTION public.get_parcelas_resumo(p_evento_id UUID)
RETURNS TABLE(
  total_parcelas BIGINT,
  total_valor NUMERIC,
  total_pago NUMERIC,
  total_pendente NUMERIC,
  total_atrasado NUMERIC,
  qtd_pagas BIGINT,
  qtd_pendentes BIGINT,
  qtd_atrasadas BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COALESCE(SUM(valor), 0),
    COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE status = 'pago'),
    COUNT(*) FILTER (WHERE status = 'pendente'),
    COUNT(*) FILTER (WHERE status = 'atrasado')
  FROM parcelas_pagamento
  WHERE evento_id = p_evento_id;
$$;

-- 8. Function to update overdue parcelas
CREATE OR REPLACE FUNCTION public.atualizar_parcelas_atrasadas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE parcelas_pagamento
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 9. Function for financial dashboard
CREATE OR REPLACE FUNCTION public.get_financeiro_parcelas(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE(
  total_a_receber NUMERIC,
  total_recebido NUMERIC,
  total_atrasado NUMERIC,
  eventos_com_pendencia BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN status IN ('pendente', 'atrasado') THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status IN ('pendente', 'atrasado') THEN evento_id END)
  FROM parcelas_pagamento
  WHERE (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim);
$$;

-- 10. Function for cash flow grouped view
CREATE OR REPLACE FUNCTION public.get_fluxo_caixa_parcelas(
  p_agrupamento TEXT DEFAULT 'mes',
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE(
  periodo TEXT,
  entradas_previstas NUMERIC,
  entradas_realizadas NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE p_agrupamento
      WHEN 'dia' THEN TO_CHAR(data_vencimento, 'YYYY-MM-DD')
      WHEN 'semana' THEN TO_CHAR(date_trunc('week', data_vencimento), 'YYYY-"S"IW')
      ELSE TO_CHAR(data_vencimento, 'YYYY-MM')
    END AS periodo,
    COALESCE(SUM(CASE WHEN status IN ('pendente', 'atrasado') THEN valor ELSE 0 END), 0) AS entradas_previstas,
    COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) AS entradas_realizadas
  FROM parcelas_pagamento
  WHERE (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  GROUP BY
    CASE p_agrupamento
      WHEN 'dia' THEN TO_CHAR(data_vencimento, 'YYYY-MM-DD')
      WHEN 'semana' THEN TO_CHAR(date_trunc('week', data_vencimento), 'YYYY-"S"IW')
      ELSE TO_CHAR(data_vencimento, 'YYYY-MM')
    END
  ORDER BY periodo;
END;
$$;
