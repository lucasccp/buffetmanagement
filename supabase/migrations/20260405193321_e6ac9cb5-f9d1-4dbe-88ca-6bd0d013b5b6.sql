
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
    INSERT INTO caixa_movimentacoes (tipo, descricao, valor, data, evento_id, automatica)
    VALUES ('entrada', 'Parcela #' || NEW.numero_parcela || ' - ' || COALESCE(v_nome, ''), NEW.valor, COALESCE(NEW.data_pagamento, CURRENT_DATE), NEW.evento_id, true);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_parcela_paga_caixa
  AFTER UPDATE ON public.parcelas_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parcela_paga_caixa();
