

## Bug: Movimentações manuais do caixa não somam ao saldo

### Diagnóstico
A função SQL `get_caixa_metrics` (que alimenta os KPIs do dashboard de Caixa) calcula entradas/saídas a partir de `parcelas_pagamento` e `custos_evento` — **ignora completamente a tabela `caixa_movimentacoes`**.

Consequência: ao registrar uma movimentação manual (ex: "Em caixa" R$ 3.784,22), ela aparece na tabela de Movimentações mas **não impacta** Saldo Atual, Saldo Futuro, Entradas nem Saídas.

Os gráficos (`get_caixa_fluxo_mensal`, `get_caixa_saldo_acumulado`) já leem de `caixa_movimentacoes` corretamente — só os KPIs estão errados.

### Correção
Reescrever a função `get_caixa_metrics` para usar `caixa_movimentacoes` como fonte única de verdade (já que pagamentos e custos automaticamente geram registros lá via triggers). Adicionar entradas previstas vindas de `parcelas_pagamento` pendentes para o cálculo do saldo futuro.

### Migration
```sql
CREATE OR REPLACE FUNCTION public.get_caixa_metrics(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  entradas_realizadas numeric,
  entradas_previstas numeric,
  saidas numeric,
  saldo_atual numeric,
  saldo_futuro numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH mov AS (
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END), 0) AS saidas
    FROM caixa_movimentacoes
    WHERE (p_data_inicio IS NULL OR data >= p_data_inicio)
      AND (p_data_fim IS NULL OR data <= p_data_fim)
  ),
  prev AS (
    SELECT COALESCE(SUM(valor), 0) AS v
    FROM parcelas_pagamento
    WHERE status IN ('pendente','atrasado')
      AND (p_data_inicio IS NULL OR data_vencimento >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_vencimento <= p_data_fim)
  )
  SELECT
    mov.entradas,
    prev.v,
    mov.saidas,
    mov.entradas - mov.saidas,
    (mov.entradas + prev.v) - mov.saidas
  FROM mov, prev;
$$;
```

### Detalhes Técnicos
- Nenhuma alteração no frontend — `Caixa.tsx` já consome o RPC e o React Query revalida ao criar/excluir
- Triggers existentes (`fn_pagamento_pago_caixa`, `fn_custo_evento_caixa`) continuam alimentando `caixa_movimentacoes` automaticamente, então não há dupla contagem
- `entradas_previstas` continua vindo de parcelas pendentes (movimentações manuais não têm conceito de "previsto")

