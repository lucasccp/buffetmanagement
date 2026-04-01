
-- Enums
CREATE TYPE public.lead_status AS ENUM ('novo', 'contato_realizado', 'proposta_enviada', 'fechado', 'perdido');
CREATE TYPE public.evento_status AS ENUM ('planejado', 'confirmado', 'realizado', 'cancelado');
CREATE TYPE public.custo_categoria AS ENUM ('alimento', 'bebida', 'equipe', 'transporte', 'aluguel', 'outros');
CREATE TYPE public.item_tipo AS ENUM ('comida', 'bebida', 'sobremesa');
CREATE TYPE public.pagamento_status AS ENUM ('pendente', 'parcial', 'pago');

-- Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo_evento TEXT,
  data_prevista DATE,
  numero_convidados INT,
  observacoes TEXT,
  status lead_status NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  nome_evento TEXT NOT NULL,
  tipo_evento TEXT,
  data_evento DATE,
  horario_inicio TIME,
  horario_fim TIME,
  numero_convidados INT,
  local TEXT,
  valor_total NUMERIC CHECK (valor_total >= 0),
  status evento_status NOT NULL DEFAULT 'planejado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipe
CREATE TABLE public.equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT,
  telefone TEXT,
  custo_por_evento NUMERIC CHECK (custo_por_evento >= 0)
);

-- Evento Equipe
CREATE TABLE public.evento_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipe(id) ON DELETE CASCADE,
  valor_pago NUMERIC CHECK (valor_pago >= 0)
);

-- Custos Evento
CREATE TABLE public.custos_evento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria custo_categoria NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor >= 0),
  data_custo DATE
);

-- Itens Cardápio
CREATE TABLE public.itens_cardapio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo item_tipo NOT NULL,
  custo_unitario NUMERIC NOT NULL CHECK (custo_unitario >= 0)
);

-- Evento Cardápio
CREATE TABLE public.evento_cardapio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.itens_cardapio(id) ON DELETE CASCADE,
  quantidade INT NOT NULL CHECK (quantidade > 0)
);

-- Faturamento Evento
CREATE TABLE public.faturamento_evento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  valor_total NUMERIC NOT NULL CHECK (valor_total >= 0),
  valor_recebido NUMERIC NOT NULL DEFAULT 0 CHECK (valor_recebido >= 0),
  status_pagamento pagamento_status NOT NULL DEFAULT 'pendente',
  data_pagamento DATE
);

-- RLS (sem autenticação - acesso público)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_evento ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sem autenticação conforme requisito)
CREATE POLICY "Public access" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.eventos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.equipe FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.evento_equipe FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.custos_evento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.itens_cardapio FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.evento_cardapio FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.faturamento_evento FOR ALL USING (true) WITH CHECK (true);

-- View para dashboard com cálculos via SQL
CREATE OR REPLACE VIEW public.dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM public.eventos) AS total_eventos,
  (SELECT COALESCE(SUM(f.valor_total), 0) FROM public.faturamento_evento f) AS faturamento_total,
  (
    SELECT COALESCE(SUM(c.valor), 0) + COALESCE(SUM(ee.valor_pago), 0)
    FROM public.eventos e
    LEFT JOIN public.custos_evento c ON c.evento_id = e.id
    LEFT JOIN public.evento_equipe ee ON ee.evento_id = e.id
  ) + (
    SELECT COALESCE(SUM(ec.quantidade * ic.custo_unitario), 0)
    FROM public.evento_cardapio ec
    JOIN public.itens_cardapio ic ON ic.id = ec.item_id
  ) AS custo_total,
  CASE WHEN (SELECT COUNT(*) FROM public.eventos) > 0
    THEN (SELECT COALESCE(SUM(f.valor_total), 0) FROM public.faturamento_evento f) / (SELECT COUNT(*) FROM public.eventos)
    ELSE 0
  END AS ticket_medio;

-- View para eventos por status
CREATE OR REPLACE VIEW public.eventos_por_status AS
SELECT status, COUNT(*) AS total
FROM public.eventos
GROUP BY status;

-- Function para calcular custos totais de um evento
CREATE OR REPLACE FUNCTION public.calcular_custos_evento(p_evento_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(valor) FROM custos_evento WHERE evento_id = p_evento_id), 0) +
    COALESCE((SELECT SUM(valor_pago) FROM evento_equipe WHERE evento_id = p_evento_id), 0) +
    COALESCE((SELECT SUM(ec.quantidade * ic.custo_unitario) FROM evento_cardapio ec JOIN itens_cardapio ic ON ic.id = ec.item_id WHERE ec.evento_id = p_evento_id), 0)
$$;
