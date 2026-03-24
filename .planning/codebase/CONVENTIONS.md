# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (`AdaptationWizard.tsx`, `ProtectedRoute.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.tsx`)
- Utilities: camelCase (`exportDocx.ts`, `exportPdf.ts`)
- Types: Separate in `src/types/` directory with PascalCase names (`adaptation.ts`, `aiUsage.ts`)

**Functions:**
- Standard functions: camelCase (`sanitize()`, `cn()`, `parsePdf()`, `detectFileType()`)
- React components: PascalCase (`Login`, `ProtectedRoute`, `AdaptationWizard`)
- Hooks: camelCase with `use` prefix (`useAuth()`, `useSubscription()`)
- Event handlers: camelCase prefixed with `handle` or `on` (`handleSubmit()`, `onProgress()`)

**Variables:**
- Regular variables: camelCase (`email`, `password`, `loading`, `studentId`)
- React state: camelCase for both state and setter (`const [user, setUser] = useState()`)
- Mock data/fixtures: UPPER_SNAKE_CASE (`MOCK_USER`, `MOCK_SESSION`, `MOCK_PROFILE`)
- Constants: UPPER_SNAKE_CASE (`MAX_TEXT_CHARS = 8000`, `MAX_IMAGE_PAGES = 8`)

**Types:**
- Interfaces: PascalCase (`StructuredActivity`, `Alternative`, `BarrierItem`)
- Type aliases: PascalCase (`ActivityType`, `QuestionType`, `AdaptationResult`)
- Object type labels (as record constants): UPPER_SNAKE_CASE (`QUESTION_TYPE_LABELS`, `HIGHLIGHT_COLORS`)

## Code Style

**Formatting:**
- No `.prettierrc` file detected
- ESLint configured in `eslint.config.js`
- Uses TypeScript with strict type checking enabled
- 2-space indentation (default JavaScript)

**Linting:**
- Tool: ESLint with TypeScript support
- Config: `eslint.config.js`
- Key rules:
  - Enables `react-hooks` recommended rules
  - Disables `@typescript-eslint/no-unused-vars` (permissive for flexibility)
  - Warns on `react-refresh/only-export-components` (code splitting for hot reload)
  - Recommended extends: `@eslint/js`, TypeScript ESLint recommended

## Import Organization

**Order:**
1. React and React-like libraries first (`import { useState } from "react"`)
2. External libraries (`import { QueryClient } from "@tanstack/react-query"`)
3. Components and hooks from `@/` (internal imports using path alias)
4. Types (`import type { ...props } from "@/types/..."`)
5. Styles (CSS/Tailwind)

**Path Aliases:**
- Single alias used: `@/` resolves to `src/` (configured in `vitest.config.ts`)
- Example: `import { useAuth } from "@/hooks/useAuth"`
- Apply to all internal imports to promote consistency

**Import Style:**
- Named imports preferred: `import { Button } from "@/components/ui/button"`
- Default exports used for page components: `export default function Login() {}`
- Mock imports in tests use `vi.mock()` pattern

## Error Handling

**Patterns:**
- Try/finally blocks for resource cleanup and state reset: `setLoading(false)` in finally
- Error object inspection: Check error message content with string methods
  ```typescript
  if (error.message?.includes("Invalid login")) {
    toast.error("E-mail ou senha incorretos.");
  }
  ```
- Return-style error objects: `{ error: any }` pattern from async functions
- Toast notifications for user-facing errors via `sonner` library
- Runtime type guards: `isStructuredActivity()` function for type narrowing

## Logging

**Framework:** No dedicated logger detected; uses `console` implicitly via browser DevTools

**Patterns:**
- No explicit logging statements found in source code
- Errors logged to user via toast notifications: `toast.error(message)`
- PDF parsing uses optional callback for progress: `onProgress?.(page, pageCount)`
- Comments document side effects and important flows

## Comments

**When to Comment:**
- Document non-obvious logic or business rules
- JSDoc blocks for utility functions with parameters and return types
- Inline comments for complex parsing (e.g., PDF magic byte validation)
- Section separators using `// ─── Section Name ───` style in fixtures and helpers

**JSDoc/TSDoc:**
- Used for public utility functions: `parsePdf()`, `sanitize()`, `detectFileType()`
- Includes parameter descriptions and return type documentation
- Example from `src/lib/utils/pdf.ts`:
  ```typescript
  /**
   * PDF utilities using pdfjs-dist (npm).
   * Extracts text and renders pages as JPEG images.
   */
  export async function parsePdf(
    file: File,
    onProgress?: (page: number, total: number) => void
  ): Promise<PdfParseResult>
  ```

## Function Design

**Size:** No enforced limits; largest files are pages (1236 lines in `QuestionBank.tsx`) and components (879 lines in `AdaptationEditModal.tsx`)

**Parameters:**
- Destructured props pattern for React components: `{ user, loading }`
- Optional parameters use TypeScript optional (`?`) syntax
- Type annotations required for all function parameters (TypeScript strict mode)
- Callback functions use optional chaining: `onProgress?.(page, pageCount)`

**Return Values:**
- Consistent return type annotations
- Async functions return Promises with specific types: `Promise<PdfParseResult>`
- Component functions return JSX (implicit `React.ReactNode`)
- Utility functions return typed values: `string`, `boolean`, `null` with union types

## Module Design

**Exports:**
- Page components use default exports: `export default function Login() {}`
- Utility functions use named exports: `export function cn(...inputs: ClassValue[])`
- Type definitions use named exports: `export interface Alternative {}`
- Constants and record objects use named exports: `export const QUESTION_TYPE_LABELS`

**Barrel Files:**
- No `index.ts` barrel files detected in `src/` (each import specifies exact file path)
- Leads to explicit imports: `import { cn } from "@/lib/utils"`
- Encourages clear dependency tracking

**Module Organization:**
- By feature/concern: `src/components/adaptation/`, `src/lib/pdf/`, `src/integrations/supabase/`
- Test files mirror source structure in `src/test/`
- UI components auto-generated and isolated in `src/components/ui/` (don't edit manually)

## Language & Text

**UI Text:**
- Portuguese (Brazilian) for all user-facing strings
- Examples: "Entrar" (login), "Aguarde..." (waiting), "E-mail ou senha incorretos" (errors)

**Code:**
- Variables, functions, comments: English
- Type names: English (e.g., `StructuredActivity`, not `AtividadeEstruturada`)

## Type Safety

**Approach:**
- Strict TypeScript enabled
- Interface-first for data structures
- Type guards for runtime validation: `isStructuredActivity(data)`
- Union types for variants: `ActivityType = "prova" | "exercicio" | "atividade_casa" | "trabalho"`
- Optional fields with `?`: `notes?: string`, `images?: string[]`

## Accessibility & Semantic HTML

**Pattern:**
- `id` and `htmlFor` props for form labels: `<Label htmlFor="email">E-mail</Label>`
- Live region announcer detected in `AdaptationWizard` for screen readers: `element.getElementById("live-announcer")`
- Semantic HTML elements via shadcn/ui (Radix primitives)

---

*Convention analysis: 2026-03-24*
