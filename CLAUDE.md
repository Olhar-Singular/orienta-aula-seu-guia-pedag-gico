# Orientador Digital

## Regra de Commit

**Nunca fazer commit automaticamente.** Sempre aguardar confirmação explícita do usuário após validação e teste manual.

## Regra de Migrations (importante)

**Nunca use `make sb-reset` só pra rodar uma migration nova.** Ele dropa o DB local inteiro e recria do zero — você perde o usuário de teste e qualquer dado local.

Fluxo correto pra aplicar uma migration nova localmente:

```bash
supabase migration up --local    # aplica só as migrations pendentes, preserva dados
make gen-types                   # regenera tipos após mudança de schema
```

Use `make sb-reset` **apenas** quando:

- precisa voltar do zero pra debugar corrupção ou divergência de schema
- o usuário pedir explicitamente
- após sb-reset, rodar `make db-seed-test-user` para recriar o usuário de teste (`teste@teste.com` / `123123`)

Plataforma educacional para professores brasileiros adaptarem atividades para alunos com barreiras de aprendizagem usando IA (Design Universal para Aprendizagem — DUA).

## Comandos Essenciais

### Docker (container do app)

```bash
make up                  # Subir container (build + start)
make down                # Parar container
make rebuild             # Rebuild após mudar dependências
make shell               # Shell dentro do container
make logs                # Logs do container
```

### Dev (rodam dentro do container via make)

```bash
make dev                 # Dev server (Vite, porta 8080)
make build               # Build produção
make lint                # ESLint
make test                # Vitest (single run)
make test-watch          # Vitest (watch mode)
make typecheck           # TypeScript check
```

### Supabase (CLI no host — `supabase start` gerencia todos os serviços)

```bash
make sb-start            # Subir Supabase local (DB, Auth, Storage, Functions, Studio)
make sb-stop             # Parar Supabase local
make sb-status           # Exibir URLs e keys do Supabase local
make sb-reset            # Reset DB local (reaplica migrations)
make sb-login            # Autenticar no Supabase (remoto)
make sb-link             # Vincular ao projeto remoto
make db-push             # Aplicar migrations no remoto
make gen-types           # Gerar tipos TypeScript do schema local
make gen-types-remote    # Gerar tipos TypeScript do schema remoto
make fn-deploy-all       # Deploy de todas as edge functions
make fn-serve            # Servir funções localmente
make sync                # db-push + fn-deploy-all + gen-types-remote
```

### Atalhos

```bash
make start               # Subir tudo (Supabase local + container app)
make stop                # Parar tudo (container app + Supabase local)
```

### Sem Docker (fallback / CI)

```bash
npm run dev              # Dev server direto
npm run build            # Build produção
npm run test             # Vitest direto
bun install              # Instalar deps (CI usa --frozen-lockfile)
```

## Setup Inicial

```bash
# 1. Instalar Supabase CLI (binário direto, sem npm)
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
  | tar -xz -C ~/.local/bin supabase

# 2. Configurar .env
cp .env.example .env

# 3. Subir tudo
make start               # supabase start + docker compose up

# 4. Copiar keys do supabase status para o .env
make sb-status           # Pegar VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
```

> **Arquitetura**: Supabase CLI roda no host e gerencia ~11 containers automaticamente.
> O app roda num container Docker separado (Node 20-slim com glibc) para evitar conflito musl/glibc do Lovable.
> `node_modules` fica num volume Docker separado. Edições no host refletem em tempo real via volume mount.

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
| Deploy      | Vercel (GitHub Actions)                      |
| Pacotes     | Bun (CI) / npm (dev)                         |

## Variáveis de Ambiente

```bash
VITE_SUPABASE_URL=              # URL do projeto Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=  # Chave anon
VITE_SUPABASE_PROJECT_ID=       # ID do projeto
```

## MCP Servers

Servidores MCP configurados em `.mcp.json` (auto-descobertos pelo Claude Code):

| Servidor   | Transporte    | Uso                                                                        |
|------------|---------------|----------------------------------------------------------------------------|
| `supabase` | HTTP          | Queries, migrations e edge functions no projeto Supabase remoto            |
| `context7` | stdio (`npx`) | Docs ao vivo: TipTap, @react-pdf/renderer, @dnd-kit, Radix, TanStack Query |

### Quando consultar Context7

Antes de escrever ou modificar código que usa API de lib externa complexa, consulte o Context7 para não adivinhar assinaturas:

- Extensões TipTap (`src/lib/tiptap/`)
- Templates PDF (`src/lib/pdf/templates/` e componentes `@react-pdf/renderer`)
- Drag-and-drop (`@dnd-kit/*`)
- Componentes Radix via shadcn
- Opções avançadas do TanStack Query (v5)

Fluxo: `resolve-library-id` (acha o ID canônico, ex: `/ueberdosis/tiptap-docs`) → `query-docs` (busca a seção relevante).

### API key opcional

Context7 funciona sem autenticação (rate limit anônimo). Se hit limit, obtenha key em context7.com/dashboard e adicione em `.mcp.json`:

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"],
  "env": { "CONTEXT7_API_KEY": "ctx7sk-..." }
}
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

O wizard tem dois modos (escolhidos no step `choice`): **AI** (geração assistida pela IA) e **manual** (o professor edita direto). Ambos compartilham a maioria dos steps:

```
[1] Tipo → [2] Conteúdo → [3] Barreiras → [4] Modo → [5] Editor → [6] Layout PDF → [7] Exportar
```

- `[5] Editor`: `StepAIEditor` no modo AI (gera e edita DSL universal/dirigida), `StepEditor` no modo manual.
- `[6] Layout PDF`: `StepPdfPreview` com editor visual dual-column (universal vs directed) e coloração inline por palavra.

**Estado preservado** (ver `src/lib/adaptationWizardHelpers.ts`): `WizardData` mantém drafts do editor (`aiEditorUniversalDsl`, `aiEditorDirectedDsl`, `manualEditorDsl`) e o layout editado (`editableActivity`, `editableActivityDirected`, `pdfLayout`) ao navegar entre steps. Layout só é invalidado quando o texto do editor realmente muda. Ir pra trás do editor com resultado já gerado dispara diálogo de confirmação ("Descartar resultado?").

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
Lint → Test → Build
```
Usa Bun com `--frozen-lockfile`. Requer secrets: vars Supabase. Deploy feito automaticamente pelo Vercel via integração nativa com GitHub.

## Segurança

- **Nunca push direto para `main`** — usar feature branches + PR
- `.env` no `.gitignore` — nunca commitar credenciais
- Tokens de compartilhamento expiram em 7 dias
- Share tokens excluem caracteres ambíguos (0, O, l, I, 1)
- Validação de magic bytes para uploads (PDF: `%PDF`, DOCX: `PK`, imagens: JPEG/PNG headers)
- Auth via Supabase com session em localStorage + auto-refresh

## Modo de discussão

- Quando eu disser "vamos discutir" ou "quero explorar uma ideia", entre em modo de brainstorming: faça perguntas clarificadoras antes de implementar qualquer coisa.
- Só comece a codar quando eu disser "pode implementar" ou "vai em frente".
