

# Plano: Adaptar Login/Register ao tema do app (claro e escuro)

## Problema atual
A tela de login usa cores hardcoded escuras (`#0f0a1a`, `text-white`, `bg-white/5`, etc.) que ignoram o sistema de tema do app. Precisa respeitar ambos os modos (claro e escuro).

## Mudanças

### 1. `src/pages/Login.tsx` -- Substituir cores hardcoded por variáveis CSS do tema
- **Fundo**: trocar `style={{ background: "#0f0a1a..." }}` por `className="bg-background"`
- **Textos**: `text-white` → `text-foreground`, `text-white/40` → `text-muted-foreground`
- **Card glass**: `border-white/[0.08]` e `bg-white/5` → `border-border` e `bg-card/80 backdrop-blur-xl`
- **Inputs**: `bg-white/5 text-white` → `bg-input text-foreground`, borders via `border-border`
- **Glow effects**: manter usando `hsl(var(--primary))` e `hsl(var(--accent))` (já dinâmicos)
- **Botões**: já usam `hsl(var(--primary))` -- manter, ajustar texto para `text-primary-foreground`
- **Light beams**: `via-white/30` → `via-foreground/20` para funcionar em ambos os temas
- **Checkbox**: adaptar cores para usar variáveis do tema
- **Links e labels**: usar `text-muted-foreground` e `text-foreground`

### 2. `src/pages/Register.tsx` -- Mesmas adaptações
- Aplicar exatamente as mesmas substituições de cores

### 3. Importar e usar o hook `useTheme`
- Importar `useTheme` em ambas as páginas para ter acesso ao tema atual
- Adicionar toggle de tema (Sun/Moon) discreto no canto da tela de login

## Resultado
As telas de login e registro seguirão automaticamente o tema ativo do app, mantendo os efeitos 3D, glassmorphism e animações, mas com cores que se adaptam ao modo claro e escuro.

