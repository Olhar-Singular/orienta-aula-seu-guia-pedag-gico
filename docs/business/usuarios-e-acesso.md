# Regras de Negócio: Usuários e Controle de Acesso

## Papéis

| Papel | Chave | Acesso |
|-------|-------|--------|
| Professor | `teacher` | Dashboard, wizard, turmas, alunos, chat, banco questões, histórico |
| Admin | `admin` | Tudo de professor + gestão de professores + relatório de uso IA |

**Origem do papel**: Tabela `school_members.role`, consultada via `useUserSchool()`.

## Autenticação

| Regra | Detalhe |
|-------|---------|
| Método | Email + senha via Supabase Auth |
| Persistência | Session em localStorage com auto-refresh |
| Redirect pós-signup | `${origin}/dashboard` |
| Signup inclui metadata | `{ name }` em `user_metadata` |
| Logout | `supabase.auth.signOut()` — limpa session |

## Rotas Protegidas

| Guard | Componente | Comportamento quando falha |
|-------|-----------|---------------------------|
| ProtectedRoute | Verifica `useAuth().user` | Redirect → `/login` |
| AdminRoute | Verifica `useAuth().user` + `memberRole === "admin"` | Redirect → `/dashboard` |

### Fluxo de Loading

| Estado | Exibição |
|--------|----------|
| `authLoading = true` | Spinner (pulse animation) |
| `schoolLoading = true` | Spinner (Loader2) |
| Ambos false, user null | Redirect |

## Escopo Multi-tenant

| Regra | Testável como |
|-------|--------------|
| Dados isolados por `school_id` | Queries filtram por school_id do contexto |
| Professor só vê suas turmas | Query usa `teacher_id = user.id` |
| Admin vê dados da escola toda | Queries filtram por `school_id` sem filtro de teacher |

## Gestão de Professores (Admin)

| Operação | Edge Function | Regra |
|----------|---------------|-------|
| Criar professor | `admin-manage-teachers` (action: create) | Email + senha (min 6 chars) + cargo |
| Editar professor | `admin-manage-teachers` (action: update) | Nome e cargo editáveis |
| Remover professor | `admin-manage-teachers` (action: remove) | Confirmação obrigatória |
| Reset senha | `admin-manage-teachers` (action: reset-password) | Nova senha (min 6 chars) |
| Import CSV | `admin-manage-teachers` (action: import) | Colunas: nome, email, cargo |

## Compartilhamento Público

| Regra | Detalhe |
|-------|---------|
| Token | 24 chars, charset sem ambíguos (sem 0, O, l, I, 1) |
| Validação | Regex: `/^[A-Za-z2-9]{24}$/` |
| Expiração | 7 dias a partir da criação (calculado no frontend) |
| Acesso | Via RPC `get_shared_adaptation(p_token)` — sem auth |
| Rota | `/compartilhado/:token` |
