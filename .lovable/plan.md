

# Plano: Integrar parcelas na aba Pagamentos e criar trigger de entrada no caixa

## Resumo

Remover a aba "Parcelas" separada do EventoDetail e mover o botão "Gerar Parcelas" + listagem de parcelas para dentro da aba "Pagamentos" existente. Criar um trigger no banco para que, ao marcar uma parcela como "pago", uma entrada seja automaticamente registrada no caixa.

## Alterações

### 1. Banco de dados — Trigger para parcela paga → entrada no caixa

Criar migration com trigger `fn_parcela_paga_caixa` na tabela `parcelas_pagamento`:
- Quando `status` muda para `'pago'`, inserir entrada em `caixa_movimentacoes` com tipo `'entrada'`, valor da parcela, evento_id, e `automatica = true`
- Buscar `nome_evento` do evento para a descrição (ex: "Parcela #2 - Nome do Evento")

### 2. EventoDetail — Remover aba Parcelas, integrar na aba Pagamentos

**`src/pages/EventoDetail.tsx`**:
- Remover import do `ParcelasTab`
- Remover `<TabsTrigger value="parcelas">` e `<TabsContent value="parcelas">`
- Na função `PagamentosTab`, adicionar:
  - Queries de parcelas (`parcelas_pagamento`) e resumo (`get_parcelas_resumo`)
  - Botão "Gerar Parcelas" com dialog (lógica vinda do `ParcelasTab`)
  - Seção de parcelas abaixo da tabela de pagamentos existente, com cards de resumo e tabela de parcelas
  - Botão "Pagar" em cada parcela pendente/atrasada
  - Botão "Excluir Todas" as parcelas

### 3. Limpeza

- Remover arquivo `src/components/ParcelasTab.tsx` (não mais necessário)

## Detalhes técnicos

- O trigger usa `SECURITY DEFINER` e `search_path = 'public'`
- A condição do trigger: `NEW.status = 'pago' AND (OLD IS NULL OR OLD.status <> 'pago')` — evita duplicar entradas
- Invalidar queries de `caixa_movimentacoes` após marcar parcela como paga no frontend

