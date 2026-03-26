# Orientador Digital

## Regra de Commit

**Nunca fazer commit automaticamente.** Sempre aguardar confirmação explícita do usuário após validação e teste manual.

Plataforma educacional para professores brasileiros adaptarem atividades para alunos com barreiras de aprendizagem usando IA (Design Universal para Aprendizagem — DUA).

## Comandos Essenciais

```bash
npm run dev              # Dev server (Vite, porta 8080)
npm run build            # Build produção
npm run lint             # ESLint
npm run test             # Vitest (single run)
npm run test:watch       # Vitest (watch mode)
bun install              # Instalar deps (CI usa --frozen-lockfile)
```

## Stack

| Camada       | Tecnologia                                  |
|-------------|---------------------------------------------|
| Framework   | React 18 + TypeScript 5.8 + Vite 5          |
| Estilo      | Tailwind CSS 3 + shadcn/ui (Radix)          |
| Estado      | TanStack Query (server) + Context (auth)     |
| Backend     | Supabase (auth, DB, edge functions)          |
| Editor      | TipTap                                       |
| Export      | @react-pdf/renderer + docx                   |
| Testes      | Vitest + Testing Library + jsdom             |
| Deploy      | Cloudflare Pages (GitHub Actions)            |
| Pacotes     | Bun (CI) / npm (dev)                         |

## Variáveis de Ambiente

```bash
VITE_SUPABASE_URL=              # URL do projeto Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=  # Chave anon
VITE_SUPABASE_PROJECT_ID=       # ID do projeto
```

## Estrutura

```
src/
├── components/
│   ├── ui/              # shadcn/ui — NÃO EDITAR manualmente
│   ├── adaptation/      # Wizard de adaptação (5 steps)
│   ├── admin/           # Dashboard admin
│   ├── chat/            # Chat com IA
│   ├── student/         # Gestão de alunos
│   └── landing/         # Landing page pública
├── pages/               # Rotas (dashboard, admin, etc.)
├── hooks/               # useAuth, useUserSchool, useAiUsageReport
├── lib/                 # Lógica de negócio e utilitários
│   ├── pdf/             # Geração PDF (templates, fontes, componentes)
│   ├── tiptap/          # Extensões do editor
│   ├── barriers.ts      # Dimensões de barreiras (11 categorias)
│   ├── streamAI.ts      # Streaming SSE para edge functions
│   ├── exportPdf.ts     # Export PDF
│   └── exportDocx.ts    # Export DOCX
├── types/               # Tipos TypeScript (adaptation.ts, aiUsage.ts)
├── integrations/
│   └── supabase/        # Client e types — NÃO EDITAR types.ts
└── test/                # Testes, helpers, fixtures
```

## Arquitetura

### Fluxo Principal: Wizard de Adaptação

```
[1] Tipo de Atividade → [2] Conteúdo → [3] Barreiras → [4] Resultado IA → [5] Exportar
     (prova/exercício/     (texto/PDF/       (11 dimensões:       (universal +        (PDF/DOCX/
      atividade_casa/       DOCX/imagem/      TEA, TDAH, etc.)     dirigida)           salvar/
      trabalho)             banco questões)                                             compartilhar)
```

### Controle de Acesso

| Rota           | Proteção        | Verificação                |
|---------------|-----------------|----------------------------|
| `/dashboard/*` | ProtectedRoute  | `useAuth()` → user != null |
| `/admin/*`     | AdminRoute      | `memberRole === "admin"`   |
| `/compartilhado/:token` | Nenhuma | Token público com expiração |

### Tipos Estruturados (adaptation.ts)

```typescript
StructuredActivity { sections: ActivitySection[] }
  └── ActivitySection { questions: StructuredQuestion[] }
       └── StructuredQuestion { type: QuestionType, statement, alternatives?, scaffolding? }

QuestionType = 'multiple_choice' | 'open_ended' | 'fill_blank' | 'true_false'
```

O resultado da IA retorna `version_universal` + `version_directed`, ambos usando `StructuredActivity` ou string legada.

### Edge Functions (Supabase)

- `adapt-activity` — adaptação principal com streaming SSE
- `regenerate-question` — regenerar questão individual
- `extract-questions` — extração de questões de PDF/imagem
- `generate-question-image` — gerar imagem para questão
- `admin-ai-usage-report` — relatório de uso de IA
- `admin-manage-teachers` — CRUD de professores

## Convenções de Código

### Nomenclatura
- Componentes: PascalCase (`AdaptationWizard.tsx`)
- Hooks: camelCase com prefixo `use` (`useAuth.tsx`)
- Utilitários: camelCase (`exportDocx.ts`)
- Fixtures de teste: UPPER_SNAKE_CASE (`MOCK_USER`)

### Imports
- Usar alias `@/` para tudo dentro de `src/`: `import { cn } from "@/lib/utils"`
- Ordem: React → libs externas → módulos internos → tipos

### Idioma
- **UI**: Português brasileiro
- **Código** (variáveis, funções, comentários): Inglês

### Padrões de Teste
- Helpers: `mockAuthHook()`, `createSupabaseMock()`, `createTestWrapper()`
- Fixtures: `src/test/fixtures.ts`
- Setup global: `src/test/setup.ts` (mocks de matchMedia, ResizeObserver, etc.)
- Coverage thresholds: 60% statements, 55% branches

## Fluxo TDD Obrigatório

Toda alteração de código segue o ciclo **Red → Green → Refactor**:

### RED — Escreva o teste que falha
1. Criar teste em `src/test/` espelhando a estrutura do source
2. Usar helpers de `src/test/helpers.ts` para mocks
3. Rodar `npm run test` — o teste DEVE falhar
4. Commitar: `test: describe failing test for <feature>`

### GREEN — Faça o teste passar
1. Implementar o mínimo necessário para o teste passar
2. Rodar `npm run test` — TODOS os testes DEVEM passar
3. Commitar: `feat: implement <feature>`

### REFACTOR — Melhore sem quebrar
1. Limpar código, extrair funções, melhorar nomes
2. Rodar `npm run test` — TODOS os testes DEVEM continuar passando
3. Rodar `npm run lint` — sem erros
4. Commitar: `refactor: clean up <feature>`

**Regra de ouro**: Nunca pular uma fase. Nunca editar código sem teste que cubra a mudança.

## Arquivos Protegidos — NÃO EDITAR

- `src/components/ui/*` — shadcn/ui (usar CLI: `npx shadcn-ui@latest add <component>`)
- `src/integrations/supabase/types.ts` — gerado automaticamente do schema

## Áreas Frágeis

- `src/lib/pdf/` — parsing de texto complexo com LaTeX e fontes
- `src/integrations/supabase/client.ts` — auto-gerado
- Renumeração de questões após deleção em renderers

## Memória e Performance

- Testes rodam com `NODE_OPTIONS='--max-old-space-size=19456'`
- Vitest usa fork pool (max 4 workers) para estabilidade de memória
- PDF: max 8 páginas de imagem, texto limitado a 8000 chars

## CI/CD

Pipeline em `.github/workflows/deploy.yml`:
```
Lint → Test → Build → Deploy (Cloudflare Pages)
```
Usa Bun com `--frozen-lockfile`. Requer secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, vars Supabase.

## Segurança

- **Nunca push direto para `main`** — usar feature branches + PR
- `.env` no `.gitignore` — nunca commitar credenciais
- Tokens de compartilhamento expiram em 7 dias
- Share tokens excluem caracteres ambíguos (0, O, l, I, 1)
- Validação de magic bytes para uploads (PDF: `%PDF`, DOCX: `PK`, imagens: JPEG/PNG headers)
- Auth via Supabase com session em localStorage + auto-refresh

## Projeto Atual: Skip AI Mode

Opção "Pular IA" no wizard de adaptação. Professores escolhem entre adaptação assistida por IA ou manual. Testes já definidos em `src/test/skip-ai-mode.test.ts`.

**Fluxo manual**: `type → content → choice → editor → export`
**Fluxo IA**: `type → content → barriers → result → export`
