## Melhorias de Produto e Validação de Dados

Pulando a Fase 1 (segurança RLS) por solicitação do usuário. Implementando validações de produto e correção de inconsistências.

---

### O que será feito

**1. Validação obrigatória de `data_evento` no formulário**
- Tornar o campo `data` do dialog "Novo Evento" obrigatório (`required`)
- Adicionar validação no submit: bloquear criação sem data
- Replicar a mesma validação na edição (`EventoDetail.tsx`)

**2. Validação de status `confirmado`**
- Ao tentar salvar evento com status `confirmado`, exigir:
  - `data_evento` preenchido
  - `valor_total > 0`
- Mostrar toast de erro explicando o que falta

**3. Badge de inconsistência nos cards de evento**
- Na lista de eventos (`Eventos.tsx`), adicionar um indicador visual (ícone + tooltip) quando o evento tiver:
  - Sem data
  - Sem valor (ou valor = 0)
  - Custos > faturamento (prejuízo)
- Ícone discreto (AlertTriangle âmbar) ao lado do nome

**4. Correção do registro órfão**
- Atualizar evento "Ana Carolina Nascimento (Casamento)" (id `20ec41d6-7410-43a9-b994-193025dd8a5c`):
  - Como não sabemos a data correta, alterar status de `confirmado` para `planejado` (consistente com falta de data)
  - Usuário poderá editar e definir a data quando souber

### Detalhes técnicos

- Validações apenas no frontend (React) — não exigem migration
- A correção do registro órfão usa `UPDATE` via insert tool
- Nenhuma alteração nos cálculos SQL ou triggers

### Fora de escopo (mencionado no relatório, não será feito agora)

- Fase 1: restringir RLS de `leads`, `equipe`, `caixa_movimentacoes`, `faturamento_evento`, bucket `notas-fiscais` a admins
- Habilitar "Leaked password protection" (ação manual no Cloud)
- Logs de auditoria
