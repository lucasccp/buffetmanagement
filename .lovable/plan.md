

## Bug: Datas salvando com D+1 (timezone offset)

### Diagnóstico
Os campos de data usam `<Input type="date">` que retorna strings no formato `YYYY-MM-DD`. Quando essas strings são exibidas via `formatDate()` em `src/lib/formatters.ts`, o código faz `new Date("2026-04-20")` — o JavaScript interpreta isso como **UTC midnight**, e ao formatar no fuso horário do Brasil (UTC-3) volta para 19/04 às 21h. Inversamente, em alguns componentes que usam o `Calendar` do shadcn (objeto `Date` local), ao converter para string via `toISOString().split("T")[0]` o offset empurra para o dia seguinte.

O problema afeta toda a aplicação: Caixa, Eventos, Pagamentos, Custos, Leads, Calendário, Financeiro.

### Causa raiz em dois lugares

**1. `src/lib/formatters.ts` — `formatDate`**
```ts
new Date(date).toLocaleDateString("pt-BR")  // 2026-04-20 → vira 19/04 no Brasil
```

**2. Conversões `Date → string` via `toISOString()`**
Vários componentes (DatePickers em Eventos, Pagamentos, etc.) fazem `date.toISOString().split("T")[0]`, o que aplica offset UTC e salva D+1 ou D-1 dependendo do fuso.

### Correção

#### 1. Corrigir `formatDate` em `src/lib/formatters.ts`
Parsear strings `YYYY-MM-DD` manualmente em vez de passar para `new Date()`:
```ts
export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "—";
  if (typeof date === "string") {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return new Date(date).toLocaleDateString("pt-BR");
};
```

#### 2. Criar helper `dateToISOString` em `src/lib/formatters.ts`
Para converter objetos `Date` (vindos do Calendar/DayPicker) em string `YYYY-MM-DD` usando componentes locais, sem offset UTC:
```ts
export const dateToISOString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
```

#### 3. Substituir todos os `toISOString().split("T")[0]` e `format(date, "yyyy-MM-dd")` aplicados a objetos `Date` provenientes de Calendar/DayPicker
Arquivos a verificar e ajustar (apenas onde a string é salva no banco, não onde é só filtro de período):
- `src/pages/Eventos.tsx`
- `src/pages/EventoDetail.tsx`
- `src/pages/Pagamentos.tsx` (se existir, ou aba dentro de EventoDetail)
- `src/pages/Leads.tsx` / `src/pages/LeadDetail.tsx`
- `src/pages/Caixa.tsx` (form de nova movimentação já usa `<input type="date">` direto, OK)
- `src/pages/Financeiro.tsx`, `src/pages/Calendario.tsx` (verificar)

Substituir por `dateToISOString(date)`.

#### 4. Onde a entrada já é `<input type="date">` (string `YYYY-MM-DD`)
Não precisa alterar nada — a string vai direta ao banco. O bug era apenas na **exibição** via `formatDate`, que será corrigida no passo 1.

### Detalhes Técnicos
- Nenhuma migration SQL necessária — os dados já no banco estão corretos no formato `YYYY-MM-DD`, só estavam sendo exibidos/salvos com offset
- Após o fix, datas existentes voltam a aparecer corretas automaticamente
- `formatDate` continua compatível com objetos `Date` (usado em alguns lugares para timestamps `created_at`)

