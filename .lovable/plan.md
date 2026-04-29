# Remodelar criação de cardápio com categorias

## Objetivo
Tornar a criação e edição de cardápios mais intuitiva, com categoria por item (texto livre) e fluxo simples para adicionar vários itens rapidamente. Itens ficam agrupados visualmente pela categoria informada.

## Mudanças no banco
Adicionar coluna `categoria` (text, nullable) em `cardapio_itens`. Itens existentes ficam sem categoria (exibidos como "Sem categoria").

## Novo fluxo do formulário "Novo Cardápio"

Cabeçalho do cardápio (campos no topo):
- Nome do cardápio *
- Valor por pessoa (R$)

Bloco de itens, organizado por categoria:
- O usuário digita o nome da categoria (ex: "Entradas", "Bebidas") e clica em "+ Adicionar categoria".
- Dentro de cada categoria aparece uma lista de inputs de itens com botão "+ Adicionar item" embaixo.
- Cada linha de item tem: nome do item + botão remover (lixeira).
- Tecla Enter no input de item adiciona automaticamente uma nova linha vazia (atalho rápido).
- Categorias podem ser renomeadas e removidas (a remoção da categoria pede confirmação e remove os itens dentro).
- Categorias podem ser reordenadas via setas ↑ ↓ (opcional, simples).
- Uma categoria padrão "Geral" é criada automaticamente para acelerar o uso.

Layout (mobile-first, glassmorphism existente):

```text
┌─ Novo Cardápio ────────────────────┐
│ Nome *           Valor/pessoa      │
│ [__________]     [R$ ___]          │
│                                    │
│ Itens do cardápio                  │
│ ┌─ Entradas              [↑][↓][×]┐│
│ │ • [Bruschetta________]      [🗑]││
│ │ • [Carpaccio_________]      [🗑]││
│ │ [+ Adicionar item]              ││
│ └─────────────────────────────────┘│
│ ┌─ Pratos principais     [↑][↓][×]┐│
│ │ • [Risoto____________]      [🗑]││
│ │ [+ Adicionar item]              ││
│ └─────────────────────────────────┘│
│ [+ Adicionar categoria]            │
│                                    │
│ [Cancelar]            [Cadastrar]  │
└────────────────────────────────────┘
```

## Edição de cardápio
O `EditCardapioDialog` recebe a mesma interface, pré-populando categorias a partir dos itens existentes (agrupando por `categoria`). Itens sem categoria aparecem em "Sem categoria" e podem ser movidos.

## Visualização (modal "Ver")
A visualização passa a mostrar itens agrupados por categoria com badges, mantendo o estilo atual.

## Importação por PDF
Sem mudanças funcionais — o parser já retorna categorias; agora a `categoria` será persistida em `cardapio_itens.categoria` em vez de ser descartada no insert.

## Geração de PDFs
Sem mudanças nesta entrega. O PDF continua listando os itens (já deduplicados). Posso, em uma próxima iteração, exibir os itens agrupados por categoria no PDF, se quiser.

## Detalhes técnicos
- Migration: `ALTER TABLE public.cardapio_itens ADD COLUMN categoria text;`
- `src/pages/Cardapio.tsx`: substituir o formulário `Novo Cardápio` pelo novo componente `CardapioFormFields` com estrutura `{ categoria: string, itens: { nome: string }[] }[]`. No submit, achatar para inserts em `cardapio_itens` incluindo `categoria`.
- `src/components/EditCardapioDialog.tsx`: usar o mesmo `CardapioFormFields`. No salvar: diff entre itens originais e novos via `id` (mantém update/delete/insert atual) e atualiza/insere `categoria`.
- Novo componente reutilizável `src/components/CardapioFormFields.tsx` com a UI de categorias + itens, validação leve (nome obrigatório por categoria, itens vazios são ignorados no submit).
- Modal "Ver cardápio" em `Cardapio.tsx`: agrupar `cardapio_itens` por `categoria` e renderizar uma seção por grupo.
- `ImportCardapioDialog.tsx`: passar `categoria: item.categoria` (vindo do parser, hoje implícito pelo nome da categoria pai) no insert dos itens.
- Acessibilidade: inputs com labels, botões com `aria-label`, alvo de toque ≥ 40px no mobile.
