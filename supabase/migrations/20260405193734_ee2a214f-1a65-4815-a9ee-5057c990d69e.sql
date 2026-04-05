
-- 1. Clean existing data
DELETE FROM caixa_movimentacoes;
DELETE FROM parcelas_pagamento;
DELETE FROM pagamentos_evento;

-- 2. Add referencia_id to track source of caixa entries
ALTER TABLE caixa_movimentacoes ADD COLUMN referencia_id uuid;
CREATE INDEX idx_caixa_referencia_id ON caixa_movimentacoes(referencia_id);

-- 3. Update fn_pagamento_pago_caixa to include referencia_id
CREATE OR REPLACE FUNCTION public.fn_pagamento_pago_caixa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome TEXT;
BEGIN
  IF NEW.status = 'pago' AND (OLD IS NULL OR OLD.status <> 'pago') THEN
    SELECT nome_evento INTO v_nome FROM eventos WHERE id = NEW.evento_id;
    INSERT INTO caixa_movimentacoes (tipo, descricao, valor, data, evento_id, automatica, referencia_id)
    VALUES ('entrada', 'Pagamento recebido - ' || COALESCE(v_nome, ''), NEW.valor, COALESCE(NEW.data_pagamento, CURRENT_DATE), NEW.evento_id, true, NEW.id);
  END IF;
  -- If status changed FROM pago to something else, remove the caixa entry
  IF OLD IS NOT NULL AND OLD.status = 'pago' AND NEW.status <> 'pago' THEN
    DELETE FROM caixa_movimentacoes WHERE referencia_id = OLD.id AND automatica = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Update fn_parcela_paga_caixa to include referencia_id
CREATE OR REPLACE FUNCTION public.fn_parcela_paga_caixa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome TEXT;
BEGIN
  IF NEW.status = 'pago' AND (OLD IS NULL OR OLD.status <> 'pago') THEN
    SELECT nome_evento INTO v_nome FROM eventos WHERE id = NEW.evento_id;
    INSERT INTO caixa_movimentacoes (tipo, descricao, valor, data, evento_id, automatica, referencia_id)
    VALUES ('entrada', 'Parcela #' || NEW.numero_parcela || ' - ' || COALESCE(v_nome, ''), NEW.valor, COALESCE(NEW.data_pagamento, CURRENT_DATE), NEW.evento_id, true, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Create delete trigger for pagamentos_evento
CREATE OR REPLACE FUNCTION public.fn_pagamento_deletado_caixa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM caixa_movimentacoes WHERE referencia_id = OLD.id AND automatica = true;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_pagamento_deletado_caixa
  BEFORE DELETE ON public.pagamentos_evento
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pagamento_deletado_caixa();

-- 6. Create delete trigger for parcelas_pagamento
CREATE OR REPLACE FUNCTION public.fn_parcela_deletada_caixa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM caixa_movimentacoes WHERE referencia_id = OLD.id AND automatica = true;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_parcela_deletada_caixa
  BEFORE DELETE ON public.parcelas_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parcela_deletada_caixa();

-- 7. RLS: Restrict DELETE on pagamentos_evento to admins only
DROP POLICY IF EXISTS "Authenticated access" ON pagamentos_evento;
CREATE POLICY "Authenticated read insert update" ON pagamentos_evento
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
-- Override: only admins can delete
DROP POLICY IF EXISTS "Authenticated read insert update" ON pagamentos_evento;

CREATE POLICY "Pagamentos select" ON pagamentos_evento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pagamentos insert" ON pagamentos_evento
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Pagamentos update" ON pagamentos_evento
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Pagamentos delete admin only" ON pagamentos_evento
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS: Restrict DELETE on parcelas_pagamento to admins only
DROP POLICY IF EXISTS "Authenticated access" ON parcelas_pagamento;

CREATE POLICY "Parcelas select" ON parcelas_pagamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Parcelas insert" ON parcelas_pagamento
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Parcelas update" ON parcelas_pagamento
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Parcelas delete admin only" ON parcelas_pagamento
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
