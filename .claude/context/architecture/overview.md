# Arquitetura — Orientador Digital

## Estrutura de Pastas

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

## Fluxo Principal: Wizard de Adaptação

```
[1] Tipo de Atividade → [2] Conteúdo → [3] Barreiras → [4] Resultado IA → [5] Exportar
     (prova/exercício/     (texto/PDF/       (11 dimensões:       (universal +        (PDF/DOCX/
      atividade_casa/       DOCX/imagem/      TEA, TDAH, etc.)     dirigida)           salvar/
      trabalho)             banco questões)                                             compartilhar)
```

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
       └── StructuredQuestion { type: QuestionType, statement, alternatives?, scaffolding? }

QuestionType = 'multiple_choice' | 'open_ended' | 'fill_blank' | 'true_false'
```

O resultado da IA retorna `version_universal` + `version_directed`, ambos usando `StructuredActivity` ou string legada.

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
