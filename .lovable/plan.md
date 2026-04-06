

## Proposta Comercial com IA

### Overview
Add a "Proposta" tab to the EventoDetail page that generates AI-powered commercial proposals based on the event's data (guests, menu, team, costs, pricing). A new edge function handles the AI call, and the UI provides tone selection, generation, editing, and copy actions.

### Step 1: Create Edge Function `generate-proposta`

**File:** `supabase/functions/generate-proposta/index.ts`

- Receives `evento_id` and `tom` (premium/simples/direto)
- Authenticates user via Authorization header
- Fetches from DB using service role:
  - `eventos` (name, type, date, guests, valor_total, local)
  - `evento_equipe` + `equipe` (team members and roles)
  - `evento_cardapio` + `cardapios` + `cardapio_itens` (menu items and pricing)
  - `custos_evento` (total costs)
  - `pagamentos_evento` (payment info)
- Builds structured context object
- Sends to Lovable AI gateway (`google/gemini-3-flash-preview`) with a system prompt acting as "Especialista em vendas de buffet de alto padrão"
- System prompt instructs tone adaptation based on event type and selected tone
- Uses tool calling to extract structured output with sections: `abertura`, `descricao_evento`, `cardapio`, `servicos`, `investimento`, `encerramento`
- Returns the structured proposal text
- Handles 429/402 errors properly

### Step 2: Add "Proposta" Tab to EventoDetail

**File:** `src/pages/EventoDetail.tsx`

- Add new tab "Proposta" after "Pagamentos" in the TabsList
- Create `PropostaTab` component:
  - Tone selector (premium/simples/direto) using radio group or select
  - "Gerar Proposta com IA" button that calls the edge function via `supabase.functions.invoke`
  - Loading state with spinner during generation
  - Display generated proposal in formatted sections (abertura, cardapio, etc.)
  - "Regenerar" button to re-generate
  - "Editar manualmente" button that switches to a textarea for editing
  - "Copiar" button that copies the full text to clipboard
  - Handle edge cases: insufficient data shows informative message, errors show toast

### Technical Details

- No new tables or migrations needed
- All event data is fetched server-side in the edge function
- Financial metrics (price per person, margin) calculated in the edge function from existing data
- The proposal text is kept in component state (not persisted) - regenerated on demand
- Uses `navigator.clipboard.writeText()` for copy functionality

