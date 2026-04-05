

# Plano: Tela de Login Estilizada com Autenticação

## Objetivo
Criar uma tela de login premium com efeito 3D glassmorphism, baseada no componente fornecido, adaptada para React/Vite (sem Next.js) e integrada com autenticação via Lovable Cloud.

## Adaptações Necessárias
O componente fornecido usa Next.js (`next/link`, `'use client'`), que não é compatível com este projeto Vite/React. Será adaptado:
- `next/link` → `react-router-dom` Link
- `'use client'` → removido
- Integração real com `supabase.auth` no lugar do submit simulado

## Mudanças Técnicas

### 1. Instalar dependência
- `framer-motion` para animações e efeito 3D do card

### 2. Criar `src/pages/Login.tsx`
- Adaptar o componente `sign-in-card-2` como página completa de login
- Fundo escuro com gradientes roxos e efeitos de glow animados
- Card com efeito 3D (rotação baseada no mouse via framer-motion)
- Campos de email e senha com ícones e efeitos de foco
- Toggle de visibilidade da senha
- Checkbox "Lembrar-me"
- Link "Esqueceu a senha?"
- Botão de login integrado com `supabase.auth.signInWithPassword`
- Link para tela de cadastro

### 3. Criar `src/pages/Register.tsx`
- Tela de cadastro com mesmo visual
- Campos: email, senha, confirmar senha
- Integração com `supabase.auth.signUp`

### 4. Criar `src/hooks/use-auth.ts`
- Hook com `user`, `loading`, `signOut`
- Listener `onAuthStateChange` para sessão

### 5. Criar `src/components/ProtectedRoute.tsx`
- Wrapper que redireciona para `/login` se não autenticado

### 6. Atualizar `src/App.tsx`
- Rotas `/login` e `/register` públicas
- Todas as rotas internas protegidas com `ProtectedRoute`

### 7. Atualizar `src/components/AppLayout.tsx`
- Botão de logout na sidebar

