
DROP VIEW IF EXISTS public.dashboard_metrics;
DROP VIEW IF EXISTS public.eventos_por_status;

CREATE OR REPLACE VIEW public.dashboard_metrics
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM public.eventos) AS total_eventos,
  (SELECT COALESCE(SUM(f.valor_total), 0) FROM public.faturamento_evento f) AS faturamento_total,
  (
    COALESCE((SELECT SUM(c.valor) FROM public.custos_evento c), 0) +
    COALESCE((SELECT SUM(ee.valor_pago) FROM public.evento_equipe ee), 0) +
    COALESCE((SELECT SUM(ec.quantidade * ic.custo_unitario) FROM public.evento_cardapio ec JOIN public.itens_cardapio ic ON ic.id = ec.item_id), 0)
  ) AS custo_total,
  CASE WHEN (SELECT COUNT(*) FROM public.eventos) > 0
    THEN (SELECT COALESCE(SUM(f.valor_total), 0) FROM public.faturamento_evento f) / (SELECT COUNT(*) FROM public.eventos)
    ELSE 0
  END AS ticket_medio;

CREATE OR REPLACE VIEW public.eventos_por_status
WITH (security_invoker = true)
AS
SELECT status, COUNT(*) AS total
FROM public.eventos
GROUP BY status;
