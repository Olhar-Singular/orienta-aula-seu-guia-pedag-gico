# Plano: Correções e cobertura — Login + Painel Admin

## Objetivo
Corrigir bugs reais identificados no fluxo de login e no painel de superadmin (criação, escolas, professores) e cobrir 100% dessas áreas com testes.

---

## Bugs Reais Identificados

### BUG 1 — Login: erro genérico para credencial errada (Login.tsx:32)
**Problema**: A verificação `error.message?.includes("Invalid login")` é frágil — Supabase retorna `"Invalid login credentials"` mas o texto pode variar entre versões. Se a string não bater, cai no `else` e exibe a mensagem crua em inglês ao usuário.
**Impacto**: Usuário vê mensagem de erro em inglês em vez de português.
**Correção**: Adicionar também verificação por `error.message?.includes("credentials")` como fallback, ou verificar pelo código de erro (`error.status === 400`).

### BUG 2 — Login: sem feedback de carregamento no botão "Entrar" (Login.tsx:95)
**Problema**: O botão exibe "Aguarde..." mas não desabilita o teclado — usuário pode submeter múltiplas vezes rapidamente. O `loading` desabilita o botão mas o form pode ser submetido antes do estado atualizar.
**Impacto**: Potencial duplo submit.
**Correção**: Checar `loading` no início de `handleSubmit` com early return.

### BUG 3 — TeacherManagement: `handleAdd` não limpa o form ao fechar o Dialog manualmente (TeacherManagement.tsx:142)
**Problema**: `addForm` é resetado apenas dentro do `try` de `handleAdd` (linha 181), mas se o usuário fechar o dialog via `onOpenChange` sem submeter, o form mantém os dados ao reabrir.
**Impacto**: Dados vazados entre sessões de abertura do dialog.
**Correção**: Resetar `addForm` no handler `onOpenChange` quando `open = false`.

### BUG 4 — TeacherManagement: `showPassword` persiste entre aberturas do dialog (TeacherManagement.tsx:143)
**Problema**: `showPassword` não é resetado ao fechar o dialog de adicionar professor. Se o usuário abriu a senha, fechou e reabriu, a senha continua visível.
**Impacto**: Senha exposta desnecessariamente.
**Correção**: Resetar `showPassword` ao fechar o dialog.

### BUG 5 — SchoolManagement: `handleCreate` fecha o dialog mesmo quando `createSchool` falha (SchoolManagement.tsx:49-62)
**Problema**: `onSettled` é usado (não `onSuccess`) para fechar o dialog e limpar o nome. Isso significa que em caso de erro, o dialog fecha e o usuário perde o nome digitado sem feedback visual do erro (o toast aparece mas o dialog já fechou).
**Impacto**: UX confuso — usuário precisa redigitar o nome após falha.
**Correção**: Usar `onSuccess` para limpar/fechar e `onError` para manter o dialog aberto.

### BUG 6 — SchoolManagement: mesmo padrão no `handleEdit` (SchoolManagement.tsx:69-81)
**Problema**: Mesmo de cima — `onSettled` fecha o dialog em caso de erro.
**Correção**: Separar `onSuccess` e `onError`.

### BUG 7 — useAuth: `signIn` não mapeia códigos de erro do Supabase (useAuth.tsx:51-54)
**Problema**: O hook apenas repassa o erro bruto do Supabase. O componente Login.tsx faz o mapeamento, mas a lógica de tradução de erros fica dispersa no componente em vez de centralizada no hook.
**Impacto**: Qualquer outro componente que use `signIn` teria que reimplementar o mapeamento.
**Nota**: Não vamos mover a lógica agora (escopo), mas vamos cobrir com teste o comportamento atual para garantir que o mapeamento funciona.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Login.tsx` | Editar | Fix BUG 1 (erro credentials) + BUG 2 (duplo submit) |
| `src/pages/admin/TeacherManagement.tsx` | Editar | Fix BUG 3 (form não limpa ao fechar) + BUG 4 (showPassword persiste) |
| `src/pages/admin/SchoolManagement.tsx` | Editar | Fix BUG 5 + BUG 6 (onSettled → onSuccess/onError) |
| `src/test/pages/Login.test.tsx` | Editar | Cobertura completa dos casos de erro |
| `src/test/pages/TeacherManagement.test.tsx` | Editar | Cobertura add/edit/remove dialogs + form reset |
| `src/test/pages/SchoolManagement.test.tsx` | Editar | Cobertura create/edit/delete + error handling |
| `src/test/hooks/useSchoolManagement.test.ts` | Criar | Cobertura do hook (fetch, mutations, error paths) |

---

## Testes Necessários

### Login.test.tsx — adicionar:
| Teste | O que valida |
|-------|-------------|
| Exibe "E-mail ou senha incorretos" para "Invalid login credentials" | BUG 1 — mensagem correta |
| Exibe "E-mail ou senha incorretos" para erro com "credentials" sem "Invalid login" | BUG 1 — fallback |
| Exibe mensagem de email não confirmado | Caso "Email not confirmed" |
| Exibe mensagem de erro genérica para outros erros | Fallback genérico |
| Não submete dupla chamada se já está carregando | BUG 2 — duplo submit |
| Toggle show/hide password funciona | Cobertura do botão Eye |
| Redireciona para /dashboard se user já logado | useEffect redirect |

### TeacherManagement.test.tsx — adicionar:
| Teste | O que valida |
|-------|-------------|
| Dialog "Adicionar" abre ao clicar em Adicionar | Cobertura básica |
| Formulário de add valida campos obrigatórios (toast.error) | Validação campos |
| Formulário de add valida senha < 6 chars | BUG validação senha |
| Form é resetado ao fechar dialog sem submeter | BUG 3 |
| showPassword é resetado ao fechar dialog | BUG 4 |
| `handleAdd` chama supabase.functions.invoke com dados corretos | Cobertura chamada |
| `handleAdd` exibe toast.error em caso de falha | Error path |
| `handleEdit` chama invoke com dados corretos | Cobertura edit |
| `handleRemove` chama invoke com member_id correto | Cobertura remove |
| CSV import: erro se arquivo sem header Nome/E-mail | Validação CSV |
| CSV import: chama invoke com lista parseada | Cobertura import |
| Reset password: chama invoke com action="reset-password" | Cobertura reset |

### SchoolManagement.test.tsx — adicionar:
| Teste | O que valida |
|-------|-------------|
| Dialog "Nova Escola" abre ao clicar | Cobertura básica |
| `handleCreate` chama `createSchool` com name e code gerado | Cobertura create |
| Dialog permanece aberto ao criar escola com erro | BUG 5 |
| `handleEdit` chama `updateSchool` com id e nome correto | Cobertura edit |
| Dialog permanece aberto ao editar escola com erro | BUG 6 |
| `handleDelete` chama `deleteSchool` com school_id correto | Cobertura delete |
| Dialog de confirmação de exclusão exibe nome da escola | UI delete |
| Estado vazio exibe mensagem "Nenhuma escola cadastrada" | Empty state |

### useSchoolManagement.test.ts — criar (novo):
| Teste | O que valida |
|-------|-------------|
| Busca escolas e calcula member_count corretamente | Query principal |
| createSchool chama invokeManageSchools com action="create" | Mutation create |
| updateSchool chama invoke com action="update" | Mutation update |
| deleteSchool chama invoke com action="delete" | Mutation delete |
| Exibe toast.error quando a mutation falha | Error handling |
| Invalida cache "schools-admin" após mutações | Cache invalidation |

---

## Dependências
- [ ] Precisa de nova tabela Supabase? **NÃO**
- [ ] Precisa de nova edge function? **NÃO**
- [ ] Precisa de novo componente shadcn/ui? **NÃO**

---

## Sequência de Implementação

### Fase 1 — Login
1. [RED] Adicionar testes faltantes em `Login.test.tsx` — verificar que falham
2. [GREEN] Corrigir BUG 1 e BUG 2 em `Login.tsx`
3. [REFACTOR] Revisar código

### Fase 2 — TeacherManagement
4. [RED] Adicionar testes faltantes em `TeacherManagement.test.tsx` — verificar que falham
5. [GREEN] Corrigir BUG 3 e BUG 4 em `TeacherManagement.tsx`
6. [REFACTOR] Revisar código

### Fase 3 — SchoolManagement
7. [RED] Adicionar testes faltantes em `SchoolManagement.test.tsx` — verificar que falham
8. [GREEN] Corrigir BUG 5 e BUG 6 em `SchoolManagement.tsx`
9. [REFACTOR] Revisar código

### Fase 4 — useSchoolManagement hook
10. [RED] Criar `src/test/hooks/useSchoolManagement.test.ts` — verificar que falha
11. [GREEN] Sem mudanças no hook necessárias (cobertura só)
12. [REFACTOR] Verificar se há melhorias

---

## Riscos
- Testes de TeacherManagement dependem do mock de `supabase.functions.invoke` — garantir que o mock captura os parâmetros corretos
- SchoolManagement usa `useMutation.mutate` (não `mutateAsync`) — testes precisam lidar com o padrão de callback `onSuccess/onError`

## Perguntas em Aberto
- Nenhuma — o escopo está claro.
