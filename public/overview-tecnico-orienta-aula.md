# Overview Técnico — Orienta Aula

> Gerado em: 14/03/2026  
> Versão do projeto: 0.0.0 (pré-release)

---

## 1. Arquitetura Geral

### Tipo de Arquitetura
**Monolito modular com BaaS (Backend as a Service).** O frontend é uma SPA React que consome diretamente o Supabase (PostgreSQL + Auth + Storage + Edge Functions). Não há servidor intermediário tradicional — toda lógica de negócio backend está nas Edge Functions (Deno).

### Organização de Módulos

```
src/
├── components/         # Componentes React reutilizáveis
│   ├── adaptation/     # Wizard de adaptação (5 steps)
│   ├── chat/           # Input multimodal do chat
│   └── ui/             # Design system (shadcn/ui)
├── hooks/              # Custom hooks (useAuth, useMobile, useToast)
├── lib/                # Utilitários puros (parsers, exportadores, validações)
├── pages/              # Páginas/rotas (~20 páginas)
├── integrations/       # Cliente Supabase auto-gerado
├── test/               # Testes (vitest + RTL)
└── assets/             # Imagens e logos

supabase/
├── functions/
│   ├── adapt-activity/       # Motor de adaptação ISA (principal)
│   ├── generate-adaptation/  # Geração livre com streaming
│   ├── chat/                 # Chat pedagógico com streaming
│   ├── analyze-barriers/     # Análise automática de barreiras
│   ├── extract-questions/    # OCR de provas via IA
│   ├── generate-question-image/  # Geração de imagens pedagógicas
│   └── _shared/sanitize.ts   # Sanitização compartilhada
└── config.toml               # Configuração do projeto
```

### Separação de Camadas

| Camada | Implementação |
|--------|--------------|
| **UI** | React + shadcn/ui + Tailwind CSS |
| **Estado** | React state local + React Query (cache) + Context (auth) |
| **Lógica de negócio** | Distribuída entre Edge Functions (IA, rate limiting) e client-side (parsers, exportadores) |
| **Dados** | Supabase PostgreSQL com RLS |

**Ponto de atenção:** Não há uma camada de "services" explícita no frontend. Chamadas ao Supabase e fetch direto às Edge Functions estão nos componentes. Isso funciona para o tamanho atual do projeto mas pode dificultar refatoração futura.

---

## 2. Frontend

### Stack Tecnológica

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18.3 | Framework UI |
| TypeScript | 5.8 | Tipagem estática |
| Vite | 5.4 | Build tool + HMR |
| Tailwind CSS | 3.4 | Estilização utility-first |
| shadcn/ui | — | Design system (Radix primitives) |
| React Router | 6.30 | Roteamento SPA |
| React Query | 5.83 | Cache e data fetching |
| Framer Motion | 12.33 | Animações |
| Tiptap | 3.20 | Editor de texto rico |
| react-markdown | 10.1 | Renderização de markdown |
| Recharts | 2.15 | Gráficos |
| docx | 9.6 | Exportação Word |
| jspdf + html2canvas | 4.2 / 1.4 | Exportação PDF |
| mammoth | 1.12 | Importação DOCX |
| pdfjs-dist | 4.4 | Leitura de PDF |
| Zod | 3.25 | Validação de schemas |
| react-hook-form | 7.61 | Formulários |

### Estado da Aplicação

- **Autenticação:** Context API (`AuthProvider`) — `user`, `session`, `loading`
- **Dados do servidor:** React Query com cache automático
- **Estado local:** `useState` nos componentes (wizard steps, modais, formulários)
- **Sem state manager global** (Redux/Zustand): adequado para o escopo atual

### Padrão de Componentes

- **Pages:** Componentes de rota em `src/pages/`, cada um envolvido por `<ErrorBoundary>`
- **Layout compartilhado:** Route layout pattern com `<Outlet />` — sidebar persistente
- **Wizard pattern:** O fluxo de adaptação usa 5 steps independentes (`StepActivityType`, `StepActivityInput`, `StepBarrierSelection`, `StepResult`, `StepExport`) coordenados por `AdaptationWizard`
- **Design tokens:** CSS variables HSL em `index.css`, consumidas via Tailwind config
- **Componentes UI:** shadcn/ui com customizações via `class-variance-authority`

---

## 3. Backend

### Stack

| Tecnologia | Uso |
|-----------|-----|
| Supabase (PostgreSQL 15) | Banco de dados, Auth, Storage, Edge Functions |
| Deno (Edge Functions) | Lógica de negócio serverless |
| Row Level Security (RLS) | Autorização a nível de banco |
| Lovable Cloud | Hosting e deployment |

### Edge Functions (Rotas)

| Função | Método | Auth | Descrição |
|--------|--------|------|-----------|
| `adapt-activity` | POST | JWT | Motor principal ISA — adaptação estruturada via tool calling |
| `generate-adaptation` | POST | Anon | Geração livre com streaming SSE |
| `chat` | POST | Anon | Chat pedagógico com streaming SSE e suporte multimodal |
| `analyze-barriers` | POST | Anon | Análise automática de barreiras de uma atividade |
| `extract-questions` | POST | JWT | OCR de provas (imagem → questões estruturadas) |
| `generate-question-image` | POST | JWT | Geração de imagens pedagógicas via IA |

**Não há controllers tradicionais.** Cada Edge Function é um endpoint único (handler Deno `serve()`).

### Banco de Dados

**18 tabelas** com RLS ativo em todas:

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do professor (nome, escola, preferências) |
| `classes` | Turmas |
| `class_students` | Alunos por turma |
| `student_barriers` | Barreiras pedagógicas por aluno |
| `adaptations` | Adaptações do wizard antigo (legacy) |
| `adaptations_history` | Adaptações do motor ISA (principal) |
| `shared_adaptations` | Links de compartilhamento temporários |
| `question_bank` | Banco de questões |
| `pdf_uploads` | Uploads de PDFs para extração |
| `chat_conversations` / `chat_messages` | Histórico do chat |
| `plans` / `user_subscriptions` / `credit_usage` | Sistema de planos (parcialmente implementado) |
| `schools` / `school_members` | Escolas e membros |
| `hidden_activities` | Exclusão lógica de atividades |
| `rate_limits` | Controle de rate limiting por usuário |

**Comunicação:** SDK `@supabase/supabase-js` no cliente, `createClient` com service role nas Edge Functions.

### Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `activity-files` | Não | Uploads de atividades |
| `question-images` | Sim | Imagens de questões |
| `question-pdfs` | Não | PDFs para extração |

---

## 4. Inteligência Artificial

### Modelos Utilizados

| Modelo | Uso | Tipo de chamada |
|--------|-----|-----------------|
| `google/gemini-2.5-flash` | Motor ISA (adaptação principal) | Tool calling (structured output) |
| `google/gemini-2.5-flash` | Chat pedagógico | Streaming SSE |
| `google/gemini-2.5-flash` | Análise de barreiras | Tool calling |
| `google/gemini-3-flash-preview` | Geração livre (wizard antigo) | Streaming SSE |
| `google/gemini-2.5-pro` | OCR de provas | Tool calling multimodal (imagem) |
| `google/gemini-3.1-flash-image-preview` | Geração de imagens pedagógicas | Tool calling (image generation) |

**Gateway:** Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) — API compatível com OpenAI.

### Integração

- **Tool calling** para outputs estruturados (adaptações, extração de questões, análise de barreiras)
- **Streaming SSE** para respostas em tempo real (chat, geração livre)
- **Multimodal** no chat (text + image_url) e na extração de questões (imagens de provas)
- Os prompts são **inline nas Edge Functions** — não há sistema de templates reutilizáveis

### Qualidade dos Prompts

**Bem implementado:**
- System prompt do ISA é extenso e bem estruturado (~200 linhas): inclui framework DUA, Taxonomia de Bloom, catálogo de estratégias por barreira, regras de notação matemática
- Travas de segurança claras ("NUNCA faça diagnóstico clínico")
- Contexto do aluno é enriquecido com histórico de barreiras e adaptações anteriores
- O campo `observationNotes` (recém-adicionado) permite ao professor fornecer contexto livre

**Pontos de melhoria:**
- Prompts estão hardcoded nas Edge Functions — difícil testar e iterar sem deploy
- O prompt do `generate-adaptation` e do `adapt-activity` têm sobreposição significativa
- Não há sistema de versionamento de prompts
- Não há fallback entre modelos (se gemini-2.5-flash falhar, não tenta outro modelo)

### Controle de Custo e Rate Limiting

| Mecanismo | Implementação |
|-----------|--------------|
| Rate limiting | 20 adaptações/hora por usuário (tabela `rate_limits`) |
| Tratamento 429 | Captura e retorna mensagem amigável ao usuário |
| Tratamento 402 | Captura erro de créditos insuficientes |
| Fallback | **Não implementado** — se o modelo falhar, retorna erro direto |
| Monitoramento | Tokens usados salvos em `adaptations_history.tokens_used` |
| Sistema de créditos | Tabelas existem (`plans`, `credit_usage`, `user_subscriptions`) mas **não estão sendo enforced** nas Edge Functions |

---

## 5. Testes

### Tipos de Teste

| Tipo | Quantidade | Framework |
|------|-----------|-----------|
| Unitários | ~10 arquivos | Vitest |
| Integração (componente) | ~6 arquivos | Vitest + React Testing Library |
| E2E | **Não existe** | — |

### Arquivos de Teste

```
src/test/
├── adaptActivity.test.ts          # Sanitização de prompts
├── adaptationWizard.test.tsx       # Wizard de adaptação
├── accessibility.test.tsx          # Testes de acessibilidade
├── barrierSimulator.test.tsx       # Simulador de barreiras
├── barriers.test.tsx               # Componente de barreiras
├── coverage-gaps.test.ts           # Gaps de cobertura
├── csvParser.test.ts               # Parser CSV
├── dashboard.test.tsx              # Dashboard
├── exportShare.test.tsx            # Exportação e compartilhamento
├── fileValidation.test.ts          # Validação de arquivos
├── integration-adaptation-flow.test.tsx   # Fluxo completo de adaptação
├── integration-barrier-simulator.test.tsx # Fluxo do simulador
├── integration-class-flow.test.tsx        # Fluxo de turmas
├── integration-question-bank.test.tsx     # Fluxo do banco de questões
├── questionParser.test.ts          # Parser de questões
├── sanitize.test.ts                # Sanitização
├── seo-polish.test.tsx             # SEO
├── settings.test.tsx               # Configurações
├── ProtectedRoute.test.tsx         # Rota protegida
└── setup.ts / fixtures.ts / helpers.ts  # Infraestrutura
```

### Comandos

```bash
npm run test        # Executa todos os testes (vitest run)
npm run test:watch  # Modo watch (vitest)
```

### Cobertura Estimada

- **Sanitização e parsers:** ~100%
- **Componentes de página:** ~40-60%
- **Edge Functions:** 0% (não testáveis localmente no setup atual)
- **Fluxos E2E:** 0%

### Áreas Críticas Sem Cobertura

1. **Edge Functions** — toda a lógica de IA, rate limiting, e persistência
2. **Exportação PDF/DOCX** — lógica complexa com dependências externas
3. **Fluxo de autenticação real** — apenas mocks
4. **Compartilhamento via link** — página `SharedAdaptation` sem testes

---

## 6. Segurança

### Autenticação e Autorização

| Aspecto | Implementação |
|---------|--------------|
| Auth provider | Supabase Auth (email/password) |
| Confirmação de email | **Ativada** (padrão) |
| Proteção de rotas | `<ProtectedRoute>` redireciona para `/login` |
| Autorização | RLS em todas as 18 tabelas |
| Functions autenticadas | `adapt-activity`, `extract-questions`, `generate-question-image` validam JWT |
| Functions públicas | `chat`, `generate-adaptation`, `analyze-barriers` aceitam anon key |
| Funções security definer | `is_class_owner`, `is_school_member`, `is_school_admin`, `get_credits_used` |

### Secrets e Variáveis de Ambiente

| Secret | Uso |
|--------|-----|
| `LOVABLE_API_KEY` | Gateway de IA (auto-provisionado) |
| `SUPABASE_SERVICE_ROLE_KEY` | Operações admin nas Edge Functions |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Conexão Supabase |
| `KIWIFY_WEBHOOK_TOKEN` | Integração pagamentos (não utilizado atualmente) |
| `SUPABASE_DB_URL` | URL direta do banco |

**Todas as secrets estão no Supabase Secrets, não no código.** As variáveis `VITE_*` no `.env` são apenas URLs e chaves públicas (publishable).

### Validações e Proteções

| Proteção | Implementação |
|----------|--------------|
| Sanitização de input | `sanitize()` em `_shared/sanitize.ts` — remove HTML, chars perigosos, trunca |
| SQL injection | Não há raw SQL — usa SDK parametrizado + `sanitize_input()` no banco |
| XSS | Sanitização de inputs + React escapa por padrão |
| Rate limiting | 20 req/hora por usuário na adaptação principal |
| Upload validation | Magic bytes + extensão + tamanho (via `fileValidation.ts`) |
| Limites de campo | Sanitização com `maxLength` em todos os campos de texto |
| CORS | Configurado em todas as Edge Functions |

### Vulnerabilidades e Más Práticas Identificadas

1. **Functions sem JWT** (`chat`, `generate-adaptation`, `analyze-barriers`) aceitam apenas anon key — qualquer pessoa com a anon key pode chamar essas funções sem estar autenticada. Risco baixo (são read-only/stateless) mas gasta créditos de IA.
2. **Roles na tabela `profiles`** — O campo `role` existe na tabela `profiles`. Embora não seja usado para autorização (RLS não depende dele), viola a recomendação de separar roles em tabela própria.
3. **`shared_adaptations` com `public_read_by_token` usando `true`** — A política permite SELECT em todas as shared_adaptations para qualquer anon/authenticated. Tokens são aleatórios mas a tabela inteira é legível. Deveria filtrar por token específico.

---

## 7. Pontos de Atenção

### Dívidas Técnicas

1. **Duas tabelas de adaptações coexistem:** `adaptations` (wizard antigo) e `adaptations_history` (motor ISA). A tabela `adaptations` parece legado e deveria ser migrada ou removida.
2. **Sistema de créditos e planos não enforced:** As tabelas `plans`, `user_subscriptions` e `credit_usage` existem, mas a lógica de verificação de créditos não é aplicada nas Edge Functions. Qualquer usuário autenticado pode gerar adaptações ilimitadas (exceto pelo rate limit de 20/hora).
3. **Prompts hardcoded:** Prompts de IA estão inline nas Edge Functions (~200+ linhas cada). Dificulta iteração, versionamento e A/B testing.
4. **Sem camada de serviços no frontend:** Chamadas ao Supabase estão diretamente nos componentes React, sem abstração intermediária.
5. **Edge Functions sem testes:** Toda a lógica de IA e backend está sem cobertura de testes automatizados.
6. **Campo `role` na tabela `profiles`:** Deveria estar em tabela separada `user_roles` para evitar escalação de privilégios.

### O Que Está Bem Feito

1. **RLS abrangente:** Todas as tabelas têm políticas RLS adequadas com funções `security definer` auxiliares
2. **Motor ISA bem projetado:** O prompt de adaptação é sofisticado — usa framework DUA, Taxonomia de Bloom, catálogo de estratégias por barreira, contexto do aluno com histórico
3. **Tool calling para structured output:** A adaptação usa `tools` + `tool_choice` para garantir formato JSON consistente — melhor que pedir JSON no prompt
4. **Sanitização consistente:** Função `sanitize()` compartilhada e aplicada em todos os inputs das Edge Functions
5. **Wizard pattern limpo:** 5 steps com estado centralizado, transições animadas, e boa UX
6. **Exportação robusta:** PDF com html2canvas + jsPDF, Word com docx.js — ambos com suporte a imagens
7. **Rate limiting funcional:** Implementação simples mas eficaz na tabela `rate_limits`
8. **Streaming SSE bem implementado:** Parser robusto com buffer, flush final, e tratamento de chunks parciais

### Top 3 Melhorias Mais Impactantes

#### 1. Proteger Edge Functions públicas com JWT
**Impacto: Segurança + Custos**  
As functions `chat`, `generate-adaptation` e `analyze-barriers` aceitam anon key. Qualquer bot pode consumir créditos de IA. Adicionar `verify_jwt = true` e validar `getUser()` nessas functions eliminaria esse risco. Estimativa: 2-4 horas.

#### 2. Enforçar sistema de créditos
**Impacto: Modelo de negócio**  
A infraestrutura de planos/créditos já existe nas tabelas, mas não é verificada antes de gerar adaptações. Adicionar uma checagem de créditos disponíveis no `adapt-activity` (e outras functions) permitiria monetização imediata. Estimativa: 4-8 horas.

#### 3. Extrair prompts para configuração versionável
**Impacto: Velocidade de iteração**  
Mover os system prompts para uma tabela `prompt_templates` ou arquivo de configuração permitiria iterar nos prompts sem fazer deploy de Edge Functions. Também habilitaria A/B testing de diferentes versões de prompt. Estimativa: 4-6 horas.

---

## Resumo Rápido

| Aspecto | Status |
|---------|--------|
| Arquitetura | ✅ Monolito modular adequado |
| Frontend | ✅ Stack moderna e bem estruturada |
| Backend | ✅ Supabase com RLS abrangente |
| IA | ✅ Bem integrada, prompts sofisticados |
| Testes | ⚠️ Parcial — faltam E2E e testes de Edge Functions |
| Segurança | ⚠️ Boa base, mas functions públicas são risco |
| Monetização | ❌ Infraestrutura existe mas não é enforced |

---

*Documento gerado automaticamente a partir da análise do código-fonte do projeto Orienta Aula.*
