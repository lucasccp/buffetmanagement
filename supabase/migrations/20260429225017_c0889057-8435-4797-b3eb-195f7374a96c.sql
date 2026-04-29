-- 1. Add 'aceita' status to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'aceita' BEFORE 'fechado';

-- 2. Create proposta_status enum
DO $$ BEGIN
  CREATE TYPE public.proposta_status AS ENUM ('enviada', 'aceita', 'convertida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Propostas table
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  cardapio_id UUID REFERENCES public.cardapios(id) ON DELETE SET NULL,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  tom TEXT NOT NULL DEFAULT 'premium',
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  numero_convidados INTEGER,
  valor_por_pessoa NUMERIC(12,2),
  valor_total NUMERIC(12,2),
  forma_pagamento TEXT,
  observacoes TEXT,
  status public.proposta_status NOT NULL DEFAULT 'enviada',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propostas_lead ON public.propostas(lead_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "propostas_select" ON public.propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "propostas_insert" ON public.propostas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "propostas_update_admin" ON public.propostas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "propostas_delete_admin" ON public.propostas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Empresa config (singleton)
CREATE TABLE IF NOT EXISTS public.empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Buffet',
  telefone TEXT,
  endereco TEXT,
  email TEXT,
  cnpj TEXT,
  logo_url TEXT,
  forma_pagamento_padrao TEXT DEFAULT 'À vista com 5% de desconto ou em até 3x no cartão',
  cor_destaque TEXT DEFAULT '#F4B942',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select" ON public.empresa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "empresa_insert_admin" ON public.empresa_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "empresa_update_admin" ON public.empresa_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "empresa_delete_admin" ON public.empresa_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed an empty row to simplify reads
INSERT INTO public.empresa_config (nome) VALUES ('Buffet') ON CONFLICT DO NOTHING;

-- 5. Trigger: when proposta is inserted, advance lead status
CREATE OR REPLACE FUNCTION public.fn_proposta_atualiza_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
    SET status = 'proposta_enviada'::lead_status
    WHERE id = NEW.lead_id
      AND status IN ('novo'::lead_status, 'contato_realizado'::lead_status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposta_atualiza_lead ON public.propostas;
CREATE TRIGGER trg_proposta_atualiza_lead
  AFTER INSERT ON public.propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_proposta_atualiza_lead();

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propostas_updated_at ON public.propostas;
CREATE TRIGGER trg_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_empresa_updated_at ON public.empresa_config;
CREATE TRIGGER trg_empresa_updated_at BEFORE UPDATE ON public.empresa_config FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 7. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies for propostas (private)
CREATE POLICY "propostas_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'propostas');
CREATE POLICY "propostas_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'propostas');
CREATE POLICY "propostas_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'propostas');
CREATE POLICY "propostas_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'propostas' AND has_role(auth.uid(), 'admin'::app_role));

-- 9. Storage policies for branding (public read, admin write)
CREATE POLICY "branding_storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'branding');
CREATE POLICY "branding_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "branding_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "branding_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));