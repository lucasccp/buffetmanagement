## Módulo Propostas + PDF inspirado no modelo

### Visão geral

- **Novo item "Propostas"** no menu lateral (entre Leads e Eventos).
- A aba "Proposta" sai de dentro do evento — vira fluxo independente.
- Ao criar uma proposta o usuário pode:
  - Escolher um **lead existente** ou **criar um novo lead** ali mesmo.
  - Escolher um **cardápio existente** ou **criar um novo cardápio** ali mesmo.
- Geração com IA, edição inline, **e download de PDF no novo layout** (modelo enviado).
- **Salva no banco apenas quando o PDF é gerado**.
- **Status do lead muda automaticamente**: gerar PDF → `proposta_enviada`; aceitar → novo status `aceita`; converter em evento → `fechado`.
- **Configurações da empresa** (nome, telefone, endereço, logo) tornam-se editáveis em uma nova tela e alimentam o cabeçalho/rodapé do PDF.

### Status dos leads

Adicionamos somente `aceita`. Os 5 atuais ficam preservados:
`novo` → `contato_realizado` → `proposta_enviada` → `aceita` → `fechado` (`perdido` em paralelo).

### Fluxo do usuário

```text
Propostas (lista)
       │
       ▼  [+ Nova Proposta]
┌───────────────────────────────────┐
│ 1. Lead    ◯ existente │ ◯ novo   │
│ 2. Cardápio ◯ existente │ ◯ novo  │
│ 3. Tom (premium / simples / ...)  │
└───────────────────────────────────┘
       │
       ▼  [Gerar com IA] → preview editável
       ▼
[Baixar PDF] ── salva proposta no banco
            ── salva PDF no Storage
            ── lead.status = 'proposta_enviada'
```

### Layout do PDF (baseado no modelo)

```text
┌───────────────────────────────────────────────────────┐
│ ▓▓▓ bege/creme com listras decorativas      [LOGO]    │  ← header
│ Proposta de orçamento                                 │
├───────────────────────────────────────────────────────┤
│ CLIENTE: <nome>      DATA EVENTO: <data>              │
│ LOCAL DO EVENTO: <endereço>                           │
├───────────────────────────────────────────────────────┤
│ DESCRIÇÃO DO SERVIÇO   <abertura + descrição IA>      │
│ CARDÁPIO               <itens do cardápio + texto IA> │
│                                                       │
│ ┌─────────────────┬───────────┬─────────┬──────────┐  │
│ │ SERVIÇOS        │ CONVIDADOS│ VALOR/PP│ TOTAL    │  │
│ ├─────────────────┼───────────┼─────────┼──────────┤  │
│ │ <nome cardápio> │  <n>      │ <pp>    │ <total>  │  │
│ └─────────────────┴───────────┴─────────┴──────────┘  │
│                                                       │
│ OBSERVAÇÕES        <texto IA>                         │
│ FORMA DE PAGAMENTO <texto IA / fixo>                  │
├───────────────────────────────────────────────────────┤
│ ▓▓▓ [LOGO/Marca]            (tel) - endereço empresa  │  ← footer
└───────────────────────────────────────────────────────┘
```

- **Paleta**: bege/creme `#EFE9DD` para faixas de header/footer, amarelo `#F4B942` para destaques (matches do modelo), preto/cinza para texto.
- **Tipografia**: serif elegante para o título "Proposta de orçamento" e nome da marca; sans-serif (Helvetica) para o restante.
- **Tabela**: cabeçalho em bege claro, linhas com bordas finas, alinhamento central nas colunas numéricas.
- **Listras decorativas**: padrão vertical fino no header e footer (renderizado em jsPDF como múltiplos rects).
- **Logo**: configurável (ver abaixo). Enquanto não houver logo enviado, mostra placeholder com inicial estilizada.

### Configurações da empresa

Nova página `/configuracoes` (admin) com:
- Nome da empresa, telefone, endereço completo, e-mail (opcional), CNPJ (opcional).
- Upload do logo (Storage bucket `branding`, público).
- Forma de pagamento padrão (texto livre que vai pro PDF).

Tabela `empresa_config` (singleton, 1 linha): `nome`, `telefone`, `endereco`, `email`, `cnpj`, `logo_url`, `forma_pagamento_padrao`.

### Banco de dados

Migração única:

1. `ALTER TYPE lead_status ADD VALUE 'aceita'` (antes de `fechado`).
2. Tabela `propostas`:
   - `id`, `lead_id` (FK leads, CASCADE), `cardapio_id` (FK cardapios, SET NULL).
   - `tom`, `conteudo` (jsonb com seções da IA), `numero_convidados` (int), `valor_por_pessoa`, `valor_total` (numeric).
   - `forma_pagamento` (text), `observacoes` (text).
   - `status` (`enviada` | `aceita` | `convertida` | `cancelada`), `evento_id` (nullable FK).
   - `pdf_url` (text), `created_at`.
3. Tabela `empresa_config` (1 linha): campos acima.
4. Bucket Storage **`propostas`** (privado) — PDFs gerados.
5. Bucket Storage **`branding`** (público) — logo da empresa.
6. RLS:
   - `propostas`: SELECT/INSERT para `authenticated`; UPDATE/DELETE só admin.
   - `empresa_config`: SELECT para `authenticated`; UPDATE/INSERT/DELETE só admin.
7. Trigger `fn_proposta_atualiza_lead`: ao inserir proposta, se lead estiver em `novo`/`contato_realizado`, atualiza para `proposta_enviada`.

### Detalhes técnicos

- **Rotas (`App.tsx`)**: `/propostas`, `/propostas/nova`, `/propostas/:id`, `/configuracoes`.
- **Sidebar**: adicionar `{ to: "/propostas", label: "Propostas", icon: FileText }` e `{ to: "/configuracoes", label: "Configurações", icon: Settings }` (apenas admin para configurações).
- **Componente `PropostaGenerator`** (`src/components/PropostaGenerator.tsx`): wrapper compartilhado da chamada à edge function + edição + download. Reutilizado em `LeadDetail` (mantém botão lá) e `/propostas/nova|/:id`.
- **PDF (`src/lib/generatePropostaPdf.ts`)**: novo gerador em jsPDF (já usado em `generateCardapioPdf.ts`). Recebe `{ proposta, lead, cardapio, empresa }` e desenha o layout acima. Carrega logo do Storage como base64.
- **Edge function `generate-proposta`**: contrato preservado. Adicionar pequeno ajuste no schema da IA para incluir `forma_pagamento` e `observacoes_finais` (campos que faltam no PDF). Sem nenhuma quebra no chamador atual.
- **Persistência ao baixar PDF**: ordem das operações (1) gerar PDF blob → (2) `INSERT propostas` → (3) upload em `propostas/{proposta_id}.pdf` → (4) `UPDATE propostas SET pdf_url` → (5) trigger atualiza lead. Em caso de erro no upload, faz rollback do insert.
- **`LeadDetail.tsx`**: passa a usar `PropostaGenerator` com `lead_id`. Botão "Marcar proposta como aceita" aparece quando o lead está em `proposta_enviada`.
- **`EventoDetail.tsx`**: remover `TabsTrigger value="proposta"` e `TabsContent value="proposta"` (linhas ~103, ~111) e o componente `PropostaTab` (linhas ~960+).
- **Conversão**: na página `/propostas/:id`, botão "Converter em evento" cria evento (mesmo padrão do `Leads.tsx`), atualiza `propostas.evento_id`, `propostas.status='convertida'` e `leads.status='fechado'`.
- **Formatadores**: adicionar `aceita: "Aceita"` em `leadStatusLabels` e cor `bg-success/10 text-success border-success/20`.

### Fora de escopo

- Versionamento de propostas (cada PDF = registro novo).
- Link público para o cliente aceitar online.
- Templates múltiplos de PDF — por enquanto só este layout.

### Estimativa

- Migração + buckets + tipos: 1 iteração curta.
- Página `/configuracoes` + upload de logo: 1 iteração curta.
- Página `/propostas` (lista) + `/propostas/:id`: 1 iteração média.
- Wizard `/propostas/nova` com mini-forms inline: 1 iteração média.
- `PropostaGenerator` + `generatePropostaPdf` + integração no `LeadDetail` + remoção do evento: 1 iteração média.