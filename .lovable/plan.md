

## Problem

The executive dashboard currently calculates revenue (`faturamento`) from `eventos.valor_total` (contracted value), but it should use **actual payments received** from `pagamentos_evento` (where `status = 'pago'`). Costs should come from `custos_evento` as they already do.

## Plan

### Step 1: Fix `get_dashboard_executivo` SQL function

Replace the revenue source:
- **Before**: `SUM(eventos.valor_total)` (contracted value)
- **After**: `SUM(pagamentos_evento.valor) WHERE status = 'pago'` (actual received payments)

The cost calculation from `custos_evento` stays the same. Lucro = faturamento (payments received) - custo_total. Margem and ticket_medio recalculated accordingly.

### Step 2: Fix `get_executivo_mensal` SQL function

Same change for the monthly breakdown:
- Revenue per month = `SUM(pagamentos_evento.valor WHERE status = 'pago')`, grouped by event month
- Costs per month stay from `custos_evento`

### Step 3: No frontend changes needed

The Dashboard.tsx page already consumes these RPCs correctly; only the SQL logic needs updating.

### Technical Detail

Single migration with `CREATE OR REPLACE FUNCTION` for both functions, joining `pagamentos_evento` to `eventos` (filtered events) for the revenue CTE instead of summing `valor_total`.

