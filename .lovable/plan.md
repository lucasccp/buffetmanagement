## Problemas observados no PDF

1. **Cardápio duplicado**: a IA gera no campo `cardapio` um parágrafo que já lista/menciona os pratos, e logo abaixo o gerador imprime os mesmos pratos como bullets vindos de `cardapio_itens`. O leitor vê duas vezes.
2. **Falta de respiro entre títulos e conteúdo**: o título da seção fica colado ao primeiro parágrafo (apenas `y += 6` após o título com fonte 11), dando aparência apertada.

## Solução

### 1. Eliminar duplicação do cardápio

Ajustar o **prompt da IA** (`supabase/functions/generate-proposta/index.ts`) para que o campo `cardapio` seja apenas uma **apresentação curta** (1 parágrafo, tom comercial — ex.: "Preparamos um cardápio cuidadosamente selecionado, pensado para encantar seus convidados…"), **sem listar pratos**. A lista de pratos fica exclusivamente nos bullets reais vindos do banco.

Atualizar a `description` do parâmetro `cardapio` no schema da function-call:
> "Apresentação curta e elegante do cardápio em 1 parágrafo (2-4 frases). NÃO liste os pratos — eles serão exibidos automaticamente abaixo em formato de bullets. Foque em qualidade, cuidado na seleção e experiência."

### 2. Layout: respiro entre títulos e conteúdo

No `src/lib/generatePropostaPdf.ts`:

- Aumentar o espaço entre o **título** da seção e o **corpo**: passar de `y += 6` para `y += 9` após o título.
- Aumentar o espaço **antes** de cada nova seção (espaço final): de `y += 4` para `y += 7`.
- Aplicar a mesma regra na seção CARDÁPIO (que tem renderização customizada).
- Adicionar uma fina linha-acento (3 mm em cor de destaque) abaixo de cada título, criando hierarquia visual clara (opcional, mas alinhado ao estilo bege/elegante atual).

### 3. Outras melhorias de UX recomendadas

a. **Indentação consistente**: hoje o corpo dos parágrafos começa em `x=40`, enquanto bullets do cardápio começam em `x=42` e o título em `x=18`. Vou alinhar título em `x=18` e corpo+bullets em `x=22` (margem de 4mm em vez de 22mm), aproveitando melhor a largura da página e ficando menos "deslocado".

b. **Largura útil maior**: aumentar `maxWidth` do wrap de `W - 60` para `W - 40`, reduzindo quebras desnecessárias e densidade visual.

c. **Numeração de páginas** no rodapé (canto direito, fonte 8, cinza): "Página X de Y" — útil em propostas de várias páginas.

d. **Quebra de página inteligente**: hoje o gerador checa `y > H - 60` apenas no início da seção, mas títulos podem ficar "órfãos" no fim de uma página com o corpo na próxima. Adicionar uma checagem que garante pelo menos ~20mm de espaço após o título antes de aceitar desenhar nele; senão, força nova página.

e. **Espaço entre seção CARDÁPIO e tabela de Investimento**: hoje a tabela aparece logo após o texto de Investimento sem título dedicado claro. Adicionar um pequeno cabeçalho "Resumo do Investimento" antes da tabela e respiro de 3-4mm entre o texto da IA e a tabela.

f. **Rodapé**: hoje o rodapé é desenhado apenas na **última** página (após todas as seções). Em PDFs de várias páginas, as páginas intermediárias ficam sem rodapé/identidade visual. Solução: ao final, percorrer todas as páginas e desenhar header/footer reduzido em cada uma (ou ao menos um rodapé minimalista com nome da empresa + número da página).

g. **Cor do corpo**: hoje usa `(60,60,60)` que é quase preto. Suavizar para `(70,70,70)` mantém legibilidade e diferencia visualmente do título.

## Perguntas

Antes de mexer no código preciso confirmar duas decisões:
