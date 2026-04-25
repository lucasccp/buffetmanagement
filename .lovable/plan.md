## Melhorias de Interface e Usabilidade

Análise focada em UI/UX após revisão das páginas (`AppLayout`, `Dashboard`, `Caixa`, `Eventos`, `EventoDetail`).

---

### Pontos fortes identificados (manter)

- Design system consistente com tokens HSL e tema claro/escuro funcionais
- Cores semânticas, tipografia minimalista, paleta lilás/rosa coerente
- React Query bem usado, animação `fade-in` no main

### Pontos fracos identificados

1. **Sidebar não colapsável no desktop** — ocupa 240px fixos mesmo quando o usuário quer mais espaço para tabelas/gráficos
2. **Header sem identidade no desktop** — só mostra botão de tema; sem breadcrumb, sem nome da página, sem ações rápidas
3. **Sem busca global** — para encontrar um evento/lead específico, precisa abrir a lista e rolar
4. **Tabelas sem busca/ordenação** — `Eventos`, `Leads`, `Equipe` não filtram nem ordenam por coluna
5. **Sem skeleton loaders** — telas piscam vazio enquanto carregam (especialmente Dashboard com 4 queries)
6. **Sem confirmação visual de modo offline / erro de rede** — falhas de query ficam silenciosas
7. **Modais de criação muito densos** — `Eventos` "Novo Evento" tem 10 campos empilhados sem agrupamento visual
8. **Empty states genéricos** — "Nenhum evento encontrado" sem CTA para criar
9. **Mobile**: KPIs do Dashboard quebram em coluna única ocupando muita altura; filtros do Caixa empilham mal
10. **Sem atalhos de teclado** (ex: `Ctrl+K` busca, `N` novo evento)
11. **Sem indicador "última atualização"** nos dashboards — usuário não sabe se dados estão frescos
12. **Falta feedback ao clicar nos KPIs** — cards parecem clicáveis mas não fazem nada

---

### Plano de execução proposto

**Fase A — Layout e navegação (alto impacto)**
1. Migrar sidebar atual para `shadcn Sidebar` com `collapsible="icon"` (modo "mini" 56px só com ícones)
2. Adicionar `SidebarTrigger` no header (sempre visível no desktop)
3. Header passa a mostrar **título da página atual** dinâmico (ex: "Dashboard / Eventos / Caixa")
4. Persistir estado colapsado/expandido no `localStorage`

**Fase B — Busca e filtros nas tabelas**
1. Adicionar input de busca em `Eventos`, `Leads`, `Equipe` (filtra por nome em tempo real)
2. Tornar headers de tabela ordenáveis (clicar em "Data", "Valor", "Status" alterna asc/desc)
3. Empty states com CTA: "Nenhum evento ainda. Criar primeiro evento →"

**Fase C — Carregamento e feedback**
1. Componente `<Skeleton>` nos KPIs do Dashboard, Caixa, Financeiro
2. Skeleton rows nas tabelas durante loading
3. Toast persistente quando uma query falha (botão "tentar novamente")

**Fase D — Modais melhores**
1. Reorganizar form "Novo Evento" em seções (Identificação / Data e horário / Comercial / Observações) com separadores
2. Auto-foco no primeiro campo ao abrir
3. Tecla `Esc` fecha (já é padrão Radix), `Enter` em qualquer campo → submit

**Fase E — Detalhes (baixo esforço, alto valor)**
1. Indicador "Atualizado há X seg" nos dashboards (com botão refresh)
2. Tornar KPIs do Dashboard navegáveis (clicar em "Faturamento" → vai pro Financeiro)
3. Atalho global `Cmd/Ctrl + K` abre paleta de busca (eventos + navegação)
4. Animar transições entre rotas (já tem fade-in, manter)

### Detalhes técnicos

- Toda mudança usa tokens semânticos do design system (sem cores hardcoded)
- `shadcn/ui` já tem `Sidebar` e `Skeleton` instalados
- Paleta de comando usa `Command` do shadcn (já presente em `ui/command.tsx`)
- Persistência em `localStorage` via hook simples
- Fases são independentes — pode aprovar tudo ou só algumas

### Estimativa

- Fase A: 1 iteração média
- Fase B: 1 iteração (3 tabelas similares)
- Fase C: 1 iteração curta
- Fase D: 1 iteração curta
- Fase E: 1 iteração média (paleta de busca é o item mais complexo)

Sugestão: começar por A + B + C que entregam o maior salto perceptível. D e E ficam para um segundo round.
