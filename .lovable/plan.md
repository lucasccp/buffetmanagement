

## Permitir Exclusão por Qualquer Usuário Autenticado

### Resumo
Atualmente, a exclusão (DELETE) em várias tabelas está restrita ao papel `admin` via RLS. O usuário quer que qualquer usuário autenticado possa excluir registros em todos os módulos. Os recálculos automáticos já existem via triggers (custos → caixa, pagamentos → caixa, etc.) e continuarão funcionando normalmente, pois as funções `get_*` calculam tudo on-the-fly via SQL.

### Tabelas afetadas (DELETE hoje restrito a admin)
- `caixa_movimentacoes` (`caixa_delete_admin`)
- `cardapios` (`cardapios_delete_admin`)
- `custos_evento` (`custos_delete_admin`)
- `equipe` (`equipe_delete_admin`)
- `eventos` (`eventos_delete_admin`)
- `faturamento_evento` (`faturamento_delete_admin`)
- `leads` (`leads_delete_admin`)
- `pagamentos_evento` (`Pagamentos delete admin only`)
- `parcelas_pagamento` (`Parcelas delete admin only`)
- `user_roles` (`user_roles_delete_admin`) — **manter restrito ao admin** por segurança (gestão de papéis)

### Alterações

#### 1. Migration: substituir políticas DELETE
Para cada tabela acima (exceto `user_roles`), dropar a política atual e criar nova permitindo DELETE para qualquer `authenticated`:

```sql
DROP POLICY "caixa_delete_admin" ON caixa_movimentacoes;
CREATE POLICY "caixa_delete" ON caixa_movimentacoes
  FOR DELETE TO authenticated USING (true);
-- (repetir para as demais tabelas)
```

#### 2. Também liberar INSERT/UPDATE em `leads`
A tabela `leads` hoje exige admin para INSERT e UPDATE (`leads_insert_admin`, `leads_update_admin`), o que é inconsistente com a abertura. Liberar para `authenticated` também, para não quebrar o fluxo de criação/edição de leads pelo usuário comum.

#### 3. Recálculos automáticos
Nada a fazer no código:
- Excluir um `pagamentos_evento` → trigger `fn_pagamento_deletado_caixa` já remove a entrada do caixa
- Excluir uma `parcelas_pagamento` → trigger `fn_parcela_deletada_caixa` já remove a entrada do caixa
- Excluir um `custos_evento` → afeta diretamente os cálculos das funções `get_dashboard_executivo`, `get_financeiro_mensal`, etc., que recalculam on-the-fly
- Excluir um `eventos` → cascade já remove dependências (custos, pagamentos, parcelas, equipe, cardápio)
- Dashboards usam React Query com `invalidateQueries` após mutações, então recarregam automaticamente

### Detalhes Técnicos
- Apenas uma migration SQL com `DROP POLICY` + `CREATE POLICY`
- `user_roles` **permanece** restrito a admin (segurança crítica de RBAC)
- `profiles` continua sem DELETE (gerenciado via edge function `admin-manage-users`)
- Nenhuma alteração no frontend necessária — os botões de exclusão já existem via `DeleteConfirmDialog`

