

# Plano: Otimizar velocidade do login

## Problema identificado

O hook `useAuth` está fazendo chamadas assíncronas ao banco de dados **dentro** do listener `onAuthStateChange`, o que bloqueia a atualização do estado de autenticação. Isso causa lentidão porque:

1. O listener `onAuthStateChange` faz `await` numa query ao banco (verificar `frozen`) antes de atualizar o estado do usuário
2. O `getSession` faz a mesma query duplicada
3. O usuário fica preso no spinner de loading enquanto essas queries completam
4. Cada mudança de estado auth dispara uma query desnecessária ao banco

## Solução

Refatorar o `useAuth` para **definir o usuário imediatamente** a partir da sessão e verificar o status `frozen` em paralelo, sem bloquear a navegação.

### Mudanças em `src/hooks/use-auth.ts`

1. No `onAuthStateChange`: definir `setUser(session?.user)` e `setLoading(false)` **imediatamente**, sem await
2. Mover a verificação de `frozen` para um `useEffect` separado que roda quando `user` muda
3. Esse efeito verifica `frozen` em background e faz signOut apenas se necessário
4. Eliminar a query duplicada no `getSession` — usar apenas o listener como fonte de verdade, com `getSession` apenas para o estado inicial síncrono

### Resultado esperado

- Login instantâneo (sem esperar query ao banco para atualizar o estado)
- Verificação de congelamento acontece em background, sem bloquear a UX
- Usuários congelados ainda são desconectados, mas sem atrasar o fluxo normal

