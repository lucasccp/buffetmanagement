
CREATE OR REPLACE FUNCTION public.fn_evento_equipe_custo()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_nome_membro TEXT;
  v_nome_evento TEXT;
BEGIN
  SELECT nome INTO v_nome_membro FROM equipe WHERE id = NEW.equipe_id;
  SELECT nome_evento INTO v_nome_evento FROM eventos WHERE id = NEW.evento_id;

  INSERT INTO custos_evento (evento_id, descricao, categoria, valor, data_custo)
  VALUES (
    NEW.evento_id,
    'Equipe: ' || COALESCE(v_nome_membro, 'Membro'),
    'equipe',
    COALESCE(NEW.valor_pago, 0),
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evento_equipe_custo
  AFTER INSERT ON public.evento_equipe
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_evento_equipe_custo();
