

## Proposta Comercial Focada no Lead

### Resumo
Mover a geração de proposta do evento para o lead, adicionar campos novos ao lead (valor do evento, endereço, cardápio vinculado), criar uma página de detalhe do lead (`/leads/:id`), e adaptar a edge function para trabalhar com dados do lead.

### Alterações

#### 1. Migration: Adicionar colunas à tabela `leads`
- `valor_evento` (numeric, nullable) — valor estimado do evento
- `endereco` (text, nullable) — endereço do evento
- `cardapio_id` (uuid, nullable) — referência ao cardápio vinculado

#### 2. Nova rota `/leads/:id` — Página de detalhe do Lead
**Arquivo:** `src/pages/LeadDetail.tsx` (novo)

Página com:
- Informações do lead (nome, telefone, email, tipo evento, data, convidados, valor, endereço, observações) — editáveis inline
- Seletor de cardápio (select com cardápios disponíveis)
- Aba/seção "Proposta com IA" — mesma UI que existe hoje no EventoDetail (tom selector, gerar, regenerar, editar, copiar)

**Arquivo:** `src/App.tsx` — adicionar rota `/leads/:id` 

**Arquivo:** `src/pages/Leads.tsx` — cada linha da tabela clicável (navegar para `/leads/:id`)

#### 3. Adaptar Edge Function `generate-proposta`
**Arquivo:** `supabase/functions/generate-proposta/index.ts`

- Aceitar `lead_id` como alternativa a `evento_id`
- Quando `lead_id` for passado:
  - Buscar dados do lead (nome, tipo_evento, data_prevista, numero_convidados, valor_evento, endereco, observacoes)
  - Buscar cardápio vinculado via `cardapio_id` → `cardapios` + `cardapio_itens`
  - Montar contexto com dados do lead em vez do evento
  - Financeiro simplificado: valor_evento e preço por pessoa estimado
- Manter compatibilidade com `evento_id` existente

#### 4. Atualizar formulário de criação de Lead
**Arquivo:** `src/pages/Leads.tsx`

Adicionar campos no dialog de criação:
- Valor do Evento (input number)
- Endereço (input text)
- Cardápio (select com lista de cardápios)

#### 5. Converter Lead → Evento com dados extras
Ao converter, copiar também `valor_evento` → `valor_total`, `endereco` → `local`, e `cardapio_id` → criar registro em `evento_cardapio`.

### Detalhes Técnicos

- Migration SQL: `ALTER TABLE leads ADD COLUMN valor_evento numeric, ADD COLUMN endereco text, ADD COLUMN cardapio_id uuid;`
- A edge function detecta se recebeu `lead_id` ou `evento_id` e monta o contexto adequado
- LeadDetail usa queries para `leads`, `cardapios` (lista para select), e `cardapio_itens` (para exibir itens do cardápio vinculado)
- Proposta tab no LeadDetail chama `supabase.functions.invoke("generate-proposta", { body: { lead_id, tom } })`

