# Arquitetura — Orientador Digital

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/              # shadcn/ui — NÃO EDITAR manualmente
│   ├── adaptation/      # Wizard de adaptação (7 steps)
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

## Fluxo Principal: Wizard de Adaptação

```text
[1] Tipo → [2] Conteúdo → [3] Barreiras → [4] Modo → [5] Editor → [6] Layout PDF → [7] Exportar
```

- `[5] Editor`: `StepAIEditor` (modo IA) ou `StepEditor` (modo manual).
- `[6] Layout PDF`: `StepPdfPreview` — editor visual dual-column com coloração inline e bold/italic.
- Estado preservado entre steps via `WizardData` (ver `src/lib/adaptationWizardHelpers.ts`); reset centralizado em `resetGeneratedState()`.

## Controle de Acesso

| Rota                    | Proteção       | Verificação                |
|-------------------------|----------------|----------------------------|
| `/dashboard/*`          | ProtectedRoute | `useAuth()` → user != null |
| `/admin/*`              | AdminRoute     | `memberRole === "admin"`   |
| `/compartilhado/:token` | Nenhuma        | Token público com expiração |

## Tipos Estruturados (adaptation.ts)

```typescript
StructuredActivity { sections: ActivitySection[] }
  └── ActivitySection { questions: StructuredQuestion[] }
       └── StructuredQuestion { type: QuestionType, statement, alternatives?, check_items?, tf_items?, match_pairs?, order_items?, table_rows?, scaffolding?, content? }

QuestionType =
  | 'multiple_choice' | 'multiple_answer' | 'open_ended' | 'fill_blank'
  | 'true_false'      | 'matching'        | 'ordering'   | 'table'
```

Resultado da IA: `version_universal` + `version_directed` (`StructuredActivity` ou string legada). Rótulos visíveis: **"Versão Original"** e **"Versão Adaptada"**.

`InlineRun` carrega `bold/italic/color` para rich content por palavra. Detalhes do fluxo em [`business/adaptation-flow.md`](../business/adaptation-flow.md).

## Edge Functions (Supabase)

- `adapt-activity` — adaptação principal com streaming SSE
- `regenerate-question` — regenerar questão individual
- `extract-questions` — extração de questões de PDF/imagem
- `generate-question-image` — gerar imagem para questão
- `admin-ai-usage-report` — relatório de uso de IA
- `admin-manage-teachers` — CRUD de professores

## CI/CD

Pipeline em `.github/workflows/deploy.yml`:
```
Lint → Test → Build → Deploy (Cloudflare Pages)
```
Usa Bun com `--frozen-lockfile`. Requer secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, vars Supabase.
