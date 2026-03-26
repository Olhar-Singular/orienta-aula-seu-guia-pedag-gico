# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**AI Adaptation Engine (via Supabase Edge Functions):**
- `adapt-activity` - Generates UDL-adapted versions of activities
  - Called via: `streamAI()` in `src/lib/streamAI.ts`
  - Response: Server-Sent Events (SSE) stream with `[DONE]` marker
  - Authentication: Bearer token from session or publishable key
  - Payload: Activity type, input text, selected barriers

- `analyze-barriers` - Analyzes student learning barriers
  - Called via: `supabase.functions.invoke("analyze-barriers", ...)` in `src/pages/BarrierSimulator.tsx`
  - Response: JSON analysis of barriers
  - Location: `src/pages/BarrierSimulator.tsx`

- `admin-manage-teachers` - Admin function for teacher management
  - Called via: `supabase.functions.invoke("admin-manage-teachers", ...)` in `src/pages/admin/TeacherManagement.tsx`
  - Operations: create, read, update, delete teachers
  - Multiple calls for CRUD operations

- `generate-pei` - Generates PEI (Plano de Educação Inclusiva) reports
  - Called via: `supabase.functions.invoke("generate-pei", ...)` in `src/components/student/StudentPeiReport.tsx`
  - Response: Generated PEI document data

**Streaming Implementation:**
- SDK/Client: Custom fetch-based streaming in `src/lib/streamAI.ts`
- Protocol: HTTP POST with server-sent events
- Base URL: `${VITE_SUPABASE_URL}/functions/v1`
- Headers: Authorization (Bearer token), apikey, Content-Type: application/json
- Response parsing: Text-based line parsing, JSON per-line format
- Handles: Stream buffering, newline splitting, `[DONE]` sentinel, error recovery

## Data Storage

**Database:**
- Provider: Supabase (PostgreSQL)
- Client: `@supabase/supabase-js` 2.95.3
- Location: `src/integrations/supabase/client.ts`
- Type definitions: Auto-generated `src/integrations/supabase/types.ts` (do not edit manually)
- Tables accessed:
  - Teachers, Students, Activities, Adaptations, Questions
  - Classes, PEI reports, AI usage tracking
  - Specific table names from generated `Database` type

**Supabase Client Configuration:**
```typescript
// src/integrations/supabase/client.ts
createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,      // Browser storage
    persistSession: true,       // Resume session across page reloads
    autoRefreshToken: true,     // Auto-refresh JWT tokens
  }
})
```

**Query Pattern:**
- Standard Supabase JS syntax: `supabase.from("table").select(...)`
- Location of queries: Scattered across pages and hooks
- Examples in: `src/pages/`, `src/components/`, `src/hooks/`

**File Storage:**
- Not explicitly configured
- PDFs and DOCX generated in-memory via @react-pdf/renderer and docx libraries
- No server-side file persistence detected

**Caching:**
- TanStack React Query (React Query) 5.83.0 - Server state caching
- Not Supabase's built-in caching
- Cache configuration in individual pages/components using React Query hooks

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in PostgreSQL auth)
- Client SDK: `@supabase/supabase-js` 2.95.3

**Implementation:**
- `src/hooks/useAuth.tsx` - React Context-based auth hook
- Methods:
  - `signUp(email, password, name)` - Email/password registration with redirect to `/dashboard`
  - `signIn(email, password)` - Email/password login
  - `signOut()` - Logout and session clear
- Features:
  - Session persistence via localStorage
  - Auto-refresh JWT tokens
  - Auth state subscription: `onAuthStateChange()` listener
  - User type: `User` from `@supabase/supabase-js`

**Protected Routes:**
- Implemented via auth state checking in page/component logic
- Session available from `useAuth()` hook
- Admin pages: `src/pages/admin/*` - Role-based access via Supabase auth metadata or custom checks

**Email Verification:**
- Redirect URL: `${window.location.origin}/dashboard` on signup
- Handled by Supabase email confirmation flow

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console logging only: `console.log()`, `console.error()` in source code
- Example: `src/lib/streamAI.ts` logs stream events
- No centralized logging service

**User Analytics:**
- AI usage tracking: `src/hooks/useAiUsageReport.ts`
- Queries Supabase tables for token usage, model metrics
- Admin dashboard: `src/pages/admin/` displays AI usage charts and statistics

## CI/CD & Deployment

**Hosting:**
- Platform: Cloudflare Pages (static file hosting)
- Deployment command: `wrangler pages deploy dist --project-name=orientador-digital`
- Automatically deploys on `git push` to `main` branch

**CI Pipeline:**
- Service: GitHub Actions (`.github/workflows/deploy.yml`)
- Triggers: Push to main branch
- Steps:
  1. Checkout code
  2. Setup Bun (latest version)
  3. Install dependencies: `bun install --frozen-lockfile`
  4. Lint: `bun run lint`
  5. Test: `bun run test` (with `NODE_OPTIONS='--max-old-space-size=19456'`)
  6. Build: `bun run build` (with Supabase env vars)
  7. Deploy to Cloudflare Pages: `wrangler pages deploy dist`

**Build Artifacts:**
- Output: `dist/` directory
- Static assets: JavaScript, CSS, HTML
- No server-side rendering - fully client-side SPA

**Secrets Required (GitHub Actions):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon public key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier
- `CLOUDFLARE_API_TOKEN` - Cloudflare authentication
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase instance URL (e.g., `https://xxxxxxxxxxx.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key (public, safe in frontend)
- `VITE_SUPABASE_PROJECT_ID` - Project ID for reference

**Env file location:**
- `.env` - Local development (not committed)
- `.env.example` - Template with required vars (committed)
- All vars must be prefixed with `VITE_` to be exposed to frontend

**Secrets location:**
- GitHub Actions: `Settings → Secrets and variables → Actions`
- Environment secrets encrypted and only injected during CI/CD
- Not stored in code or `.env` files

**Local Development Setup:**
```bash
# Copy template to local .env
cp .env.example .env
# Fill in VITE_SUPABASE_* values from Supabase dashboard
```

## Webhooks & Callbacks

**Incoming Webhooks:**
- Supabase realtime subscriptions (not explicit webhooks)
- Email confirmation redirects to `/dashboard`
- No custom webhook endpoints detected

**Outgoing Webhooks:**
- PDF/DOCX export: Generated client-side, no server calls
- Adaptation results: Streamed via Supabase edge functions (request/response, not webhooks)
- No third-party webhook integrations found

**Session Management:**
- Supabase session stored in localStorage
- JWT tokens auto-refreshed via `autoRefreshToken: true` in client config
- Subscription to auth state changes: `onAuthStateChange()` in `src/hooks/useAuth.tsx`

---

*Integration audit: 2026-03-24*
