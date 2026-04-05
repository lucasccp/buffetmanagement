
CREATE OR REPLACE FUNCTION public.fn_parcela_paga_pagamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pago' AND (OLD IS NULL OR OLD.status <> 'pago') THEN
    INSERT INTO pagamentos_evento (evento_id, valor, data_planejada, data_pagamento, metodo_pagamento, status)
    VALUES (
      NEW.evento_id,
      NEW.valor,
      NEW.data_vencimento,
      COALESCE(NEW.data_pagamento, CURRENT_DATE),
      'pix',
      'pago'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_parcela_paga_pagamento
  AFTER UPDATE ON public.parcelas_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parcela_paga_pagamento();
