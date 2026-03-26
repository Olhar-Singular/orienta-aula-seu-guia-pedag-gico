# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Component-based React SPA with server-driven adaptation via Supabase Edge Functions

**Key Characteristics:**
- Multi-step wizard pattern for activity adaptation (5-step flow)
- Server-side AI adaptation via Supabase edge functions with streaming response
- Dual-output model: universal (UDL-based) and directed (student-specific) adaptations
- Client-side structured content rendering from AI-generated JSON
- Role-based access control (teacher/admin) enforced at route and component level

## Layers

**Presentation (UI Components):**
- Purpose: Render pages, dialogs, forms, and content editors
- Location: `src/components/` and `src/pages/`
- Contains: React TSX components using shadcn/ui (Radix), TailwindCSS
- Depends on: hooks, types, utilities, Supabase client
- Used by: Router in App.tsx

**Adaptation Logic (Wizard & Renderers):**
- Purpose: Multi-step adaptation flow with stateful wizard and result rendering
- Location: `src/components/adaptation/`
- Contains: `AdaptationWizard.tsx` (state management), step components, renderers (`AdaptedContentRenderer.tsx`, `StructuredContentRenderer.tsx`), edit modal
- Depends on: `useAuth`, hooks, `supabase` client, types
- Used by: `pages/AdaptWizard.tsx` page route

**State Management:**
- Purpose: Authentication, server-state caching, form state
- Location: `src/hooks/` and implicit via TanStack Query
- Contains: `useAuth.tsx` (React Context), `useAiUsageReport.ts`, `useUserSchool.ts`, custom query hooks
- Depends on: Supabase client
- Used by: All pages and components requiring auth or data

**Business Logic (Services):**
- Purpose: AI streaming, PDF/DOCX export, validation, data transformation
- Location: `src/lib/`
- Contains: `streamAI.ts` (fetch + SSE parsing), `exportPdf.ts`, `exportDocx.ts`, `barriers.ts`, `adaptedQuestions.ts`, structured validation/migration
- Depends on: Supabase, types
- Used by: Pages and adaptation components

**Data Layer:**
- Purpose: Database access and type definitions
- Location: `src/integrations/supabase/`
- Contains: `client.ts` (Supabase client singleton), `types.ts` (auto-generated from schema)
- Depends on: Supabase JS SDK
- Used by: All pages, services, hooks

**Styling & Design System:**
- Purpose: Theme tokens, component library, utility classes
- Location: `src/components/ui/` (shadcn/ui), `src/index.css`, Tailwind config
- Contains: Auto-generated shadcn components (button, dialog, card, etc.), CSS variables
- Depends on: Radix UI, TailwindCSS
- Used by: All UI components

## Data Flow

**Adaptation Flow (Primary User Journey):**

1. User navigates to `/dashboard/adaptar` → `AdaptWizard.tsx` page mounts
2. `AdaptationWizard` component initializes with empty `WizardData` state
3. User progresses through 5 steps:
   - **Step 0 (Activity Type):** Selects activity type (prova, exercicio, etc.) → updates `data.activityType`
   - **Step 1 (Content Input):** Pastes/uploads activity text, optionally selects questions from bank → updates `data.activityText`, `data.selectedQuestions`
   - **Step 2 (Barriers & Context):** Selects student, barriers/disabilities, context (PEI, chat history) → updates `data.barriers`, `data.classId`, `data.studentId`
   - **Step 3 (AI Result):** StepResult calls Supabase edge function (via `streamAI`) with activity + barriers → receives JSON with `version_universal`, `version_directed` → StructuredContentRenderer displays
   - **Step 4 (Export):** User can save to history, export PDF/DOCX, or share public link → inserts to `adaptations_history` table
4. Export flow:
   - PDF: `exportPdf()` → `StructuredContentRenderer` components rendered via `@react-pdf/renderer`
   - DOCX: `exportDocx()` → parses structured content to docx library elements (Math fractions, LaTeX handling)
   - Share: `generateShareToken()` creates UUID, saves token → public route `/compartilhado/:token` fetches adaptation

**Question Bank Flow:**

1. User navigates to `/dashboard/banco-questoes` → `QuestionBank.tsx` page
2. Page loads questions from `supabase.from("questions").select()` with TanStack Query
3. User can filter, search, extract text via OCR, or select for adaptation
4. Selected questions passed to AdaptationWizard as `data.selectedQuestions`

**State Management:**

- **Auth State:** `useAuth()` context wraps all routes, maintains `user`, `session`, `loading` from Supabase auth listener
- **Server State:** TanStack Query caches adaptations history, questions, class data, user school/role
- **Form State:** Local component state for wizard (`WizardData`), handled via `updateData` callback and `setData`
- **Result State:** Adaptation result cached in `WizardData.result` after step 3 completes

## Key Abstractions

**StructuredActivity & Related Types:**
- Purpose: Uniform representation of adapted content (sections with questions)
- Examples: `src/types/adaptation.ts`
- Pattern: Type guards (`isStructuredActivity`), factory functions for creation, serialization for storage
- Used for both rendering and export (PDF, DOCX)

**AdaptedContentRenderer vs StructuredContentRenderer:**
- **AdaptedContentRenderer** (`src/components/adaptation/AdaptedContentRenderer.tsx`): Parses legacy string format (question number + text), handles HTML rendering
- **StructuredContentRenderer** (`src/components/adaptation/StructuredContentRenderer.tsx`): Renders typed `StructuredActivity` with explicit sections/questions/alternatives
- Migration: `getVersionText()` in `structuredMigration.ts` converts StructuredActivity back to string for backwards compatibility

**Export Pipeline:**
- `exportToPdf()` calls `downloadAdaptationPDF()` → constructs props → PDF Document/Page React components
- `exportToDocx()` → `textToParagraphs()` → parses LaTeX, fractions, images → docx Document
- Both accept optional `questionImages: Record<question_id, image_urls[]>` for inline image insertion

**Barrier Management:**
- `src/lib/barriers.ts`: Array of barrier definitions (visual, cognitive, motor, sensory, speech, motor-coordination)
- Each barrier has `dimension`, `barrier_key`, `label`, `description`, `adaptations`
- Used in step 2 to populate checkbox list, passed to edge function for AI context

## Entry Points

**App Root:**
- Location: `src/App.tsx`
- Triggers: Browser loads `/`
- Responsibilities: Wraps providers (QueryClientProvider, AuthProvider, TooltipProvider), defines route tree

**Protected Layout:**
- Location: `src/components/Layout.tsx`
- Triggers: Any route under `/dashboard/*`, `/admin/*`, `/profile`, `/chat` (via ProtectedRoute wrapper)
- Responsibilities: Renders sidebar navigation, manages mobile menu, logout button, access control check

**Authentication Guard:**
- Location: `src/components/ProtectedRoute.tsx` and `src/components/AdminRoute.tsx`
- Triggers: Redirect on missing auth or role
- Responsibilities: Check `useAuth()` user/loading, check `useUserSchool()` memberRole, redirect to `/login` if needed

**Wizard Entry:**
- Location: `src/pages/AdaptWizard.tsx` (thin wrapper)
- Triggers: User clicks "Adaptar Atividade" or navigates to `/dashboard/adaptar`
- Responsibilities: Mount AdaptationWizard component with no props

**Public Share Route:**
- Location: `src/pages/SharedAdaptation.tsx`
- Triggers: User clicks share link or navigates to `/compartilhado/:token`
- Responsibilities: Fetch adaptation by token from `shared_adaptations` table, render without auth

## Error Handling

**Strategy:** Try-catch around async operations, toast notifications for user feedback, ErrorBoundary component wraps pages

**Patterns:**

- **API Errors:** `streamAI()` calls `onError(message)` → toast shows error → user can retry
- **Export Errors:** `exportPdf()`, `exportDocx()` wrap in try-catch → log and show toast
- **Component Errors:** `ErrorBoundary.tsx` catches React render errors → shows fallback message with page reload prompt
- **Validation Errors:** Form validation (zod via shadcn forms) shows inline field errors
- **Network Errors:** Supabase client auto-retries auth, fetch errors bubble to callers

## Cross-Cutting Concerns

**Logging:**
- Console.log for streaming progress and export operations
- No persistent logging service; errors surface via toast notifications

**Validation:**
- TypeScript for compile-time type safety
- `structuredValidation.ts` provides runtime type guards (`isStructuredActivity`)
- Export data validated before passing to PDF/DOCX libraries
- LaTeX regex patterns validate fraction/exponent syntax during parsing

**Authentication:**
- Supabase Auth (email/password) via `useAuth()` context
- Session persisted in localStorage with auto-refresh
- `ProtectedRoute` enforces login, `AdminRoute` enforces admin role
- Role loaded from `user_school_members` table via `useUserSchool()` hook

**Internationalization:**
- UI text hardcoded in Portuguese (Brazilian)
- No i18n library; considered single-language product
- Student barriers and activity types have Portuguese labels in `barriers.ts` and type constants

**Accessibility:**
- `Layout.tsx` includes skip-to-content link, ARIA labels on nav items, semantic HTML
- `AdaptationWizard` uses `aria-current`, `aria-label`, live announcer for step changes
- Forms use Label components from shadcn for proper label-input association
- Mobile header includes `aria-expanded` for menu toggle

---

*Architecture analysis: 2026-03-24*
