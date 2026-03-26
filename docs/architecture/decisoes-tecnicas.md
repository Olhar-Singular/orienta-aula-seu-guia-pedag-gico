# Decisões Técnicas

## Arquitetura Geral

**SPA + BaaS**: React SPA com Supabase como backend-as-a-service. Sem servidor próprio — toda lógica server-side via Supabase Edge Functions (Deno).

**Justificativa inferida**: Minimiza infraestrutura operacional. Deploy via static hosting (Cloudflare Pages).

## Estado da Aplicação

| Tipo de estado | Solução | Onde |
|---------------|---------|------|
| Server state (DB) | TanStack Query | Hooks com `useQuery` / `useMutation` |
| Auth state | React Context | `useAuth()` via `AuthProvider` |
| Form state | Local state + react-hook-form | Componentes de formulário |
| Wizard state | `useState` no AdaptationWizard | Objeto `WizardData` passado como props |

**Decisão**: Não usar Redux/Zustand. TanStack Query cobre server state; Context API cobre auth. Wizard usa state local por ser fluxo linear isolado.

## Streaming de IA

```
Frontend (streamAI.ts) → fetch POST → Edge Function → LLM API → SSE stream
```

- Protocolo: Server-Sent Events (`data: {json}\n`)
- Terminação: `data: [DONE]`
- Parser: Custom no `streamAI.ts` (não usa EventSource API)
- Callbacks: `onDelta(text)`, `onDone()`, `onError(msg)`

**Decisão**: Fetch + ReadableStream ao invés de EventSource para controle de headers (Authorization, Content-Type).

## Dual Format (String vs Structured)

O resultado da IA pode vir em dois formatos:

| Formato | Renderer | Quando |
|---------|----------|--------|
| String (legado) | `AdaptedContentRenderer` | IA retorna texto puro formatado |
| `StructuredActivity` (JSON) | `StructuredContentRenderer` | IA retorna JSON estruturado |

**Decisão**: Manter ambos para backwards compatibility. `isStructuredActivity()` type guard decide qual renderer usar. Migração gradual para structured.

## Export Pipeline

```
StructuredActivity → getVersionText() → string → exportToPdf() / exportToDocx()
```

- PDF usa React components (`@react-pdf/renderer`) — renderiza como JSX
- DOCX usa builder pattern (`docx` lib) — constrói documento programaticamente
- Ambos parsam LaTeX inline (frações, expoentes, raízes)

**Decisão**: Duas bibliotecas separadas por diferença fundamental de approach (JSX vs builder).

## Supabase Integration

### Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `profiles` | Dados do usuário (nome, disciplina, nível) |
| `schools` | Escolas (nome, código) |
| `school_members` | Vínculo user ↔ school + role |
| `classes` | Turmas do professor |
| `class_students` | Alunos da turma |
| `student_barriers` | Barreiras ativas por aluno |
| `student_pei` | PEI do aluno |
| `adaptations_history` | Histórico de adaptações (JSON completo) |
| `shared_adaptations` | Links compartilhados (token + expiração) |
| `chat_conversations` | Conversas do chat |
| `chat_messages` | Mensagens do chat |
| `questions` | Banco de questões |
| `ai_usage_logs` | Logs de uso de IA |
| `ai_model_pricing` | Preços dos modelos |

### Padrões de Query

- **Cache**: `staleTime` de 5 min para dados estáveis (school, profile)
- **Optimistic updates**: Usado em toggle de barreiras
- **Query keys**: Namespaced por feature (`["classes"]`, `["student-barriers"]`)

## Validação de Arquivos

Upload de arquivos usa **magic bytes** (não extensão):

| Tipo | Bytes | Hex |
|------|-------|-----|
| PDF | `%PDF` | `25 50 44 46` |
| DOCX | `PK` (ZIP) | `50 4B 03 04` |
| JPEG | `ÿØÿ` | `FF D8 FF` |
| PNG | `.PNG` | `89 50 4E 47` |

**Decisão**: Mais seguro que confiar na extensão do arquivo. Previne uploads maliciosos.

## Testes

| Decisão | Detalhes |
|---------|----------|
| Framework | Vitest (nativo Vite, mais rápido que Jest) |
| DOM | jsdom (não happy-dom) |
| Pool | forks (não threads) — estabilidade de memória |
| Workers | Max 4, para evitar OOM em 32GB |
| Memória | `--max-old-space-size=19456` (19GB) |

### Padrão de Mocks

```typescript
// Auth
vi.mock("@/hooks/useAuth", () => mockAuthHook());

// Supabase
vi.mock("@/integrations/supabase/client", () => createSupabaseMock({
  classes: [MOCK_CLASS],
  class_students: [MOCK_STUDENT],
}));

// Wrapper para render
render(<Component />, { wrapper: createTestWrapper("/route") });
```

## Deploy

```
GitHub push main → Actions: Lint → Test → Build → Cloudflare Pages
```

- Package manager: Bun (`--frozen-lockfile`)
- Build output: `dist/`
- Hosting: Cloudflare Pages (static)
- Wrangler: `pages deploy dist --project-name=orientador-digital`

## LaTeX Rendering

| Camada | Biblioteca | Uso |
|--------|-----------|-----|
| Browser | KaTeX | Inline math em renderers |
| PDF | Custom `PDFFraction` component | Frações em @react-pdf |
| DOCX | `renderMathToHtml` → text extraction | Frações/expoentes como texto |

Padrões suportados: `$...$`, `\frac{}{}`, `\sqrt{}`, `x^{n}`, `x_{n}`, frações simples `a/b`.
