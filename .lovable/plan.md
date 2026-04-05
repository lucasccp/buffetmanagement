

# Plano Revisado: PDF de Cotação em formato A4

## Mudança principal
Alterar o formato do PDF de cotação de A6 para **A4** (210 x 297 mm), mantendo o mesmo visual bordô/dourado inspirado no PDF de referência.

## Mudanças Técnicas

### 1. Instalar dependência
- `jspdf` para geração client-side

### 2. Criar `src/lib/generateCardapioPdf.ts`
- Formato **A4** (210 x 297 mm)
- Capa com nome da empresa, telefone, instagram, slogan — fundo bordô (#6B1C23) com detalhes dourados (#D4A853)
- Páginas de conteúdo: título do cardápio, lista de itens com bullets, valor sugerido por pessoa
- Rodapé com marca em todas as páginas

### 3. Atualizar `src/pages/Cardapio.tsx`
- Botão "Gerar PDF" (ícone FileText) na coluna de ações de cada cardápio
- Dialog para personalizar dados da empresa (nome, telefone, instagram) antes de gerar
- Download automático do PDF gerado

