
CREATE OR REPLACE FUNCTION public.gerar_parcelas(p_evento_id uuid, p_valor_total numeric, p_num_parcelas integer, p_data_inicial date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_valor_parcela NUMERIC;
  v_resto NUMERIC;
  i INTEGER;
BEGIN
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
      (p_data_inicial + ((i - 1) * INTERVAL '1 month'))::date,
      'pendente'
    );
  END LOOP;
END;
$function$;
