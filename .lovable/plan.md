

## Adicionar Itens Inclusos Fixos na Proposta Comercial

### Problema
A seção "Serviços Inclusos" da proposta gerada por IA só menciona a equipe do evento. Faltam itens padrão do buffet (copos, pratos, talheres, rechaud, etc.) que devem sempre aparecer.

### Solução
Incluir uma lista fixa de itens inclusos no contexto enviado à IA, para que ela mescle esses itens com os dados da equipe ao redigir a seção "servicos".

### Alteração

**Arquivo:** `supabase/functions/generate-proposta/index.ts`

1. Adicionar array fixo de itens inclusos antes do objeto `context`:
```typescript
const itensInclusos = [
  "Equipe completa",
  "Copos de vidro",
  "Pratos de cerâmica",
  "Talheres de inox",
  "Todos os utensílios descartáveis necessários",
  "Rechaud",
  "Suqueiras de vidro 5 Litros",
  "Utensílios de inox",
];
```

2. Adicionar `itens_inclusos` ao objeto `context`:
```typescript
const context = {
  evento: { ... },
  financeiro: { ... },
  cardapio: itensCardapio,
  equipe: membrosEquipe,
  itens_inclusos: itensInclusos,
};
```

3. Atualizar a descrição do campo `servicos` no tool schema para instruir a IA a incorporar esses itens:
```
"Serviços inclusos: equipe, estrutura, atendimento. OBRIGATÓRIO: incluir todos os itens da lista 'itens_inclusos' do contexto (copos, pratos, talheres, rechaud, suqueiras, etc.) de forma organizada e valorizada"
```

Nenhuma alteração no frontend necessária — a IA receberá os itens e os integrará naturalmente na seção de serviços.

