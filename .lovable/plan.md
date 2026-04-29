## Objetivo

Reestruturar o PDF da proposta para refletir a mesma estrutura mostrada na pré-visualização da proposta (8 seções), mantendo o layout visual atual: cabeçalho bege com listras + título "Proposta de orçamento" + logo, dados do cliente (Cliente / Data / Local), rodapé com nome da empresa e contatos.

## Nova ordem de seções no PDF

1. **Abertura** — texto livre da IA
2. **Descrição do Evento** — texto livre da IA
3. **Cardápio** — nome do cardápio (negrito) + texto da IA + bullets dos itens vinculados
4. **Serviços** — texto livre da IA (já inclui equipe completa, copos de vidro, pratos, talheres, rechaud etc.)
5. **Investimento** — texto livre da IA + tabela com Serviço / Nº de Convidados / Valor por Pessoa / Total
6. **Forma de Pagamento** — texto livre da IA
7. **Observações Finais** — texto livre da IA
8. **Encerramento** — texto livre da IA

Todas as seções suportam `**negrito**` (já implementado).

## Mudanças de código

### `src/lib/generatePropostaPdf.ts`
- Atualizar a interface `PropostaPdfData`: substituir os campos atuais (`descricao_servico`, `texto_cardapio`, `observacoes`) pelos campos correspondentes às 8 seções:
  - `abertura`, `descricao_evento`, `cardapio`, `servicos`, `investimento`, `forma_pagamento`, `observacoes_finais`, `encerramento`
  - manter `cardapio_nome`, `cardapio_itens`, `numero_convidados`, `valor_por_pessoa`, `valor_total` (tabela)
- Renderizar as seções na ordem acima, reutilizando o helper `drawSection` (suporta `**negrito**`).
- A seção "Cardápio" mantém: nome em negrito → texto da IA → bullets dos itens.
- A seção "Investimento" mantém: texto da IA → tabela atual (cabeçalho bege escuro, 1 linha de dados).
- Manter cabeçalho, rodapé, paleta bege/dourado e listras decorativas exatamente como estão.

### `src/pages/PropostaNova.tsx`
- Atualizar o objeto enviado para `generatePropostaPdf` para passar os 8 campos do `conteudo` retornado pela IA diretamente, em vez de concatená-los em `descricao_servico`/`observacoes`.
- A pré-visualização editável (Textareas) continua a mesma — o usuário ainda edita os 8 campos do `conteudo`.

### `src/pages/PropostaDetail.tsx`
- Mesmo ajuste: ao re-baixar o PDF de uma proposta salva, mapear os 8 campos do `conteudo` (jsonb) para os parâmetros do gerador.

### Edge function `generate-proposta`
- Já retorna os 8 campos no `tool_choice` (abertura, descricao_evento, cardapio, servicos, investimento, encerramento, observacoes_finais, forma_pagamento). Nenhuma alteração necessária.

## O que **não** muda

- Cabeçalho do PDF (faixa bege, listras, título "Proposta de orçamento", logo/círculo, nome da empresa)
- Bloco de dados do cliente (Cliente, Data do evento, Local)
- Rodapé do PDF (faixa bege com nome da empresa + contatos + listras)
- Paleta de cores (bege/creme/dourado)
- Suporte a `**negrito**` no corpo das seções
- Estrutura da tabela de investimento
