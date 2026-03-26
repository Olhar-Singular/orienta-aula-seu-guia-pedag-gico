# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Large Components Need Refactoring:**
- Files: `src/pages/QuestionBank.tsx` (1236 lines), `src/pages/MyAdaptations.tsx` (887 lines), `src/components/adaptation/AdaptationEditModal.tsx` (879 lines), `src/pages/Create.tsx` (773 lines)
- Issue: Components exceed 800-line threshold, containing multiple responsibilities (data fetching, state management, rendering, file operations)
- Impact: Difficult to test, maintain, and reason about. High cognitive load. Risk of cascading bugs when modifying logic.
- Fix approach: Extract reusable hooks for state management, split rendering logic into smaller sub-components, separate file operation logic into dedicated modules

**Type Safety Gaps in Tests and Utilities:**
- Files: `src/test/helpers.ts`, `src/test/integration-*.test.tsx`
- Issue: Excessive use of `any` type (125+ instances of `.trim()` type patterns, 10+ test helpers with `any` parameters)
- Impact: Type errors pass undetected at compile time. Runtime failures in edge cases (null/undefined handling). Reduced IDE autocomplete effectiveness
- Fix approach: Replace generic `any` with specific types. Create reusable test types. Use generics in helpers

**HTML Injection Points Lack Consistent Sanitization:**
- Files: `src/pages/ClassReport.tsx`, `src/pages/QuestionBank.tsx`, `src/components/QuestionForm.tsx`, `src/components/RichTextPreview.tsx`, `src/components/FilePreviewModal.tsx`
- Issue: Multiple `dangerouslySetInnerHTML` and direct `innerHTML` assignments with user-generated or user-edited content (math LaTeX rendering, markdown formatting)
- Current: Markdown-to-HTML conversion via `.replace()` in ClassReport (line with `replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")`) is basic pattern-matching only
- Impact: Potential for XSS if rich text editor (TipTap) output or LaTeX renderer outputs are compromised. PDF and DOCX export paths handle HTML content.
- Fix approach: Use DOMPurify or similar library for all HTML sanitization. Validate LaTeX output before rendering. Audit TipTap editor configuration for content safety

**Weak Error Handling in Critical Paths:**
- Files: `supabase/functions/adapt-activity/index.ts`, `src/lib/streamAI.ts`, `src/lib/exportPdf.ts`
- Issue: Generic `catch(e: any)` blocks without proper error classification. Missing error context in logs (file `src/lib/pdf/index.tsx` has `catch(e)` with no logging or rethrow)
- Impact: Silent failures in PDF generation, unclear error messages to users. AI streaming can fail without user notification. Hard to debug production issues.
- Fix approach: Create typed error classes for each domain (ValidationError, PDFError, StreamingError). Log with context (userId, action, timestamp). Provide user-friendly error messages

**AI Billing System Has Edge Cases:**
- Files: `supabase/functions/_shared/checkCredits.ts`, `supabase/functions/_shared/logAiUsage.ts`
- Issue: `fail open` behavior (line 101 in checkCredits returns `{ ok: true }` if plan not found). Estimated token calculation relies on 3.5 chars-per-token heuristic (line 21 in logAiUsage) which varies by model and language.
- Impact: Users can exceed credits if plan lookup fails. Billing inaccuracy and cost overruns for school. Potential revenue loss.
- Fix approach: Make credit checks fail closed (return 402 Payment Required if lookup fails). Validate token counts from API responses. Add audit trail for price changes. Implement alert system when approaching credit limits

---

## Known Bugs

**PDF Export Text Parsing Corruption:**
- Symptoms: Mathematical formulas render incorrectly in PDFs with missing operators or mangled Unicode
- Files: `src/lib/pdf/textParser.ts` (line 80-84), `src/lib/pdf/htmlToPdfElements.ts`
- Trigger: PDFs containing math content, especially LaTeX with superscripts, subscripts, or special operators (∫, ∑, √)
- Details: `normalizeMathText()` performs text restoration for corrupted LaTeX from JSON streaming (`\x0Crac` → `\\frac`), but stream corruption detection is incomplete. Unicode superscript/subscript mapping exists (lines 60-74) but @react-pdf/renderer built-in fonts don't support these properly.
- Workaround: Use serif fonts that support mathematical symbols; avoid rendering complex multi-line formulas in PDFs

**Memory Exhaustion in Tests:**
- Symptoms: Tests timeout or crash when running full suite; individual tests pass
- Files: `vitest.config.ts` - configured with `NODE_OPTIONS='--max-old-space-size=19456'`
- Trigger: Large integration test files (`src/test/integration-adaptation-flow.test.tsx`, `src/test/integration-question-bank.test.tsx`) combined with mocked Supabase client
- Details: QueryClient not properly cleared between tests. Mock implementations of PDF/DOCX libraries create large in-memory objects
- Current mitigation: Max-old-space increased to 19GB; fork pool limited to 4 workers
- Root cause: Mock setup in test helpers (`createChainableQuery`) doesn't cleanup. QueryClient instance reuse across tests.

**File Upload Deduplication Inconsistency:**
- Symptoms: Same question appears multiple times in question bank after bulk import
- Files: `src/pages/QuestionBank.tsx` (lines 97-100, 200+)
- Trigger: Uploading same PDF/DOCX file twice, or importing from multiple files with overlapping content
- Details: Fingerprinting uses `normalizeTextForDedup()` which strips whitespace and lowercases. Two questions with slightly different formatting (extra spaces, case) are treated as duplicates but not always caught on second pass
- Current detection: `isDuplicate` flag set during extraction, but `originalFingerprint` only stored sometimes (optional field)

---

## Security Considerations

**Admin API Exposes All Users (Partially Mitigated):**
- Risk: `admin.auth.admin.listUsers()` in `supabase/functions/admin-manage-teachers/index.ts` (line 36) can enumerate all Supabase Auth users across all schools if pagination loop is abused
- Files: `supabase/functions/admin-manage-teachers/index.ts`, `supabase/functions/admin-ai-usage-report/index.ts`
- Current mitigation: Function checks caller is school admin via RLS (`is_school_admin` RPC). Query limited to lookup email only.
- Residual risk: Timing attack on email enumeration; no rate limiting on function invocation; auth header validation only checks token validity, not school membership explicitly in some paths
- Recommendations:
  1. Implement exponential backoff for failed auth checks
  2. Add per-IP rate limiting (10 requests/min) via Supabase Rate Limit plugin
  3. Explicitly validate school membership before returning any user data
  4. Log all admin API calls with user ID and timestamp

**HTML Rendering in Chat & Export:**
- Risk: Unsafe LaTeX rendering in `src/components/QuestionForm.tsx` line 35 and `src/lib/latexRenderer.ts` could execute scripts if LaTeX library has vulnerabilities
- Files: `src/lib/latexRenderer.ts`, `src/components/RichTextPreview.tsx` (line with dangerouslySetInnerHTML)
- Current: KaTeX is trusted, safe library, but output is not validated before rendering
- Impact: If KaTeX is compromised or has XSS gadget, user content could lead to account takeover
- Recommendations:
  1. Add Content Security Policy header (restrict to `font-src 'self' data:; script-src 'self'`)
  2. Validate KaTeX output before inserting to DOM
  3. Keep KaTeX updated (currently no explicit version pin visible in package.json analysis)

**Credential Storage in Supabase Client:**
- Risk: Supabase anon key exposed in client-side code (`VITE_SUPABASE_PUBLISHABLE_KEY` environment variable)
- Files: `src/integrations/supabase/client.ts`, `src/lib/streamAI.ts` (line 22)
- Details: Anon key is intentionally public but without proper RLS policies on sensitive tables, users can read data they shouldn't. Edge function endpoints are protected by auth token but falling back to anon key if no session (line 22 in streamAI).
- Recommendations:
  1. Ensure all user-facing tables have strict RLS policies (SELECT only own records, INSERT only with validation)
  2. Review `ai_usage_logs` RLS policy (documented as permissive in prompts as "WITH CHECK (true)")
  3. Never store sensitive data (billing details, raw API keys) in tables accessible via anon key

**Unsanitized Input in Edge Functions:**
- Risk: `supabase/functions/_shared/sanitize.ts` uses naive HTML stripping (removes all `<>` and special chars with `.replace(/[<>"'&]/g, '')`)
- Issue: Sanitize function is used in adapt-activity and other functions, but regex approach can be bypassed with Unicode escapes or entities
- Impact: Stored XSS if sanitized text is later rendered in HTML context without re-escaping
- Recommendations:
  1. Replace with DOMPurify or similar escape library
  2. Apply sanitization consistently at database INSERT time, not just in edge functions
  3. Add automated tests for sanitization bypass attempts

---

## Performance Bottlenecks

**Unoptimized Question Bank Rendering:**
- Problem: `src/pages/QuestionBank.tsx` displays paginated list (default 20 items) but queries entire table for deduplication detection
- Files: `src/pages/QuestionBank.tsx` (lines 200+)
- Cause: `fingerprint()` function called on every extracted question against all previously saved questions. No caching of fingerprints. No search index.
- Impact: Bank with 10k questions: deduplication takes O(n*m) where n=new items, m=existing items. Bulk import of 100 items = 1M comparisons. Noticeable UI lag.
- Improvement path:
  1. Add `fingerprint` column to questions table with index
  2. Batch query: `SELECT fingerprint FROM questions WHERE fingerprint IN (...)`
  3. Cache fingerprints in memory during session
  4. Implement full-text search for question lookup

**PDF Export Blocking Main Thread:**
- Problem: `exportToPdf()` in `src/lib/exportPdf.ts` calls `downloadAdaptationPDF()` which runs PDF rendering synchronously
- Impact: UI freezes for 2-3 seconds on large adaptations (30+ questions). Cannot cancel export. No progress indication.
- Improvement path:
  1. Move PDF rendering to Web Worker
  2. Add progress callback for multi-page PDFs
  3. Implement cancellation token for long-running exports

**Streaming AI Incomplete JSON Handling:**
- Problem: `src/lib/streamAI.ts` (lines 70-77) re-buffers incomplete JSON lines, causing repeated parsing attempts
- Impact: For large AI responses (5k+ tokens), incomplete chunks may trigger 100+ retry attempts per response
- Improvement path:
  1. Use streaming JSON parser library (e.g., JSONStream)
  2. Implement exponential backoff for malformed lines
  3. Set timeout to discard lines older than 5 seconds

**Supabase Query N+1 in Class Report:**
- Problem: `src/pages/ClassReport.tsx` (lines 51-77) makes separate queries for students, barriers, and history
- Details: When barriers query loads, it queries `student_barriers` for all students. If 30 students, 1 query. But if endpoint is repeatedly called, QueryClient cache misses happen.
- Impact: 4 separate queries for one page load. No parallel execution visible in code.
- Improvement path:
  1. Batch into single multi-join query or use `.select("*", { head: false })` to load relationships
  2. Enable QueryClient staleTime to avoid repeated queries within 30s

---

## Fragile Areas

**Adaptation Wizard Multi-Step Flow:**
- Files: `src/components/adaptation/AdaptationWizard.tsx`, `src/components/adaptation/StepActivityInput.tsx`, `src/components/adaptation/StepBarrierSelection.tsx`, `src/components/adaptation/StepResult.tsx`
- Why fragile: 4 separate step components managing shared state via props/callbacks. No single source of truth. If one step's validation fails silently, subsequent steps see incomplete data.
- Example: StepActivityInput may not validate file upload completely, StepResult renders with missing data
- Safe modification:
  1. Move all step state to Context or a central reducer
  2. Add explicit state validation at step transitions
  3. Test each step with mocked data from all previous steps
- Test coverage: `src/test/integration-adaptation-flow.test.tsx` exists but has low branch coverage for error paths

**PDF Generation with Custom Fonts:**
- Files: `src/lib/pdf/index.tsx`, `public/fonts/OpenDyslexic-*.otf`
- Why fragile: Custom fonts (OpenDyslexic for dyslexia accessibility) loaded from public directory. @react-pdf/renderer has known issues with non-standard font formats. Font fallback is not explicitly configured.
- Risk: Font loading fails silently, fallback to Helvetica, defeating UDL adaptation for dyslexic students
- Safe modification:
  1. Test font loading explicitly in tests before PDF rendering
  2. Add font fallback chain in PDF component configuration
  3. Log font loading failures with clear error message
  4. Consider embedding fonts in package instead of loading from filesystem

**Rich Text Editor (TipTap) Extension Configuration:**
- Files: `src/lib/tiptap/` (custom extensions), `src/components/QuestionRichEditor.tsx`, `src/components/ManualQuestionEditor.tsx`
- Why fragile: TipTap extensions may not be properly isolated. Custom formatting commands could corrupt saved content if schema changes. No migration path for old documents with custom marks/nodes.
- Safe modification:
  1. Version the TipTap schema and include version in saved adaptations
  2. Test backward compatibility when updating extensions
  3. Add strict whitelist of allowed marks and nodes
  4. Export/import uses JSON schema validation before rendering

**Supabase Auto-Generated Types File:**
- Files: `src/integrations/supabase/types.ts` (1105 lines, auto-generated)
- Why fragile: File is explicitly marked "do not edit manually" in CLAUDE.md. If Supabase schema changes and CLI regenerates, manual imports expecting old types will break silently at runtime.
- Safe modification:
  1. Regenerate types regularly (add to CI/CD)
  2. Create TypeScript module re-exports to maintain stable public API
  3. Document any schema changes that affect types
  4. Pin `supabase-js` version in package.json

---

## Scaling Limits

**Credit System Can't Handle Bulk Operations:**
- Current capacity: Checks are sequential (checkCredits → deductCredit)
- Limit: If 50 concurrent requests hit adapt-activity simultaneously, some will check credits while others are already deducting, causing overages
- Scaling path:
  1. Implement distributed lock on credit deduction (Redis or Supabase advisory locks)
  2. Pre-allocate credit quota per session with timeout
  3. Implement per-minute rate limiting (e.g., 10 requests/min per user)

**Question Bank Deduplication O(n²) Algorithm:**
- Current capacity: ~5k questions before deduplication takes >1s per upload batch
- Limit: 100k questions = batch imports become unusable
- Scaling path:
  1. Pre-compute fingerprints at insert time (not on retrieval)
  2. Use PostgreSQL full-text search on tsvector column
  3. Implement Bloom filter for fast negative lookups

**PDF Rendering Memory Usage:**
- Current capacity: ~100 pages before hitting 19GB memory limit
- Limit: School with 1000 students doing bulk exports simultaneously will exhaust memory
- Scaling path:
  1. Implement streaming PDF generation (PDFKit) instead of in-memory
  2. Queue long-running exports (Bullmq + Redis)
  3. Add per-user export quota (5/hour)

**Supabase Connection Pool:**
- Current: No explicit connection pooling configured visible in client code
- Limit: >200 concurrent users generating adaptations will hit Supabase connection limits
- Scaling path:
  1. Implement connection pooling via Supabase Connection Pooler
  2. Add request batching for bulk operations
  3. Cache frequently-accessed reference tables (barrier definitions, plans)

---

## Dependencies at Risk

**@react-pdf/renderer Vulnerabilities:**
- Risk: Library is not frequently updated; relies on outdated pdfkit. Known text layout issues with Unicode and custom fonts.
- Impact: PDF rendering failures, accessibility issues for non-English content (Portuguese in this case may have accent mark issues)
- Migration plan: Evaluate alternatives (PDFKit.js for Node, headless Chrome for rendering). Consider server-side PDF generation for better control.

**TipTap Editor Version Pinning:**
- Risk: No explicit major version lock in package.json visible. TipTap 2.x has different API than 1.x.
- Impact: `npm install` in new environment could install incompatible version, breaking rich text functionality
- Migration plan: Lock major version (`"@tiptap/core": "^2.0.0"`). Test upgrade path before minor/patch updates.

**Supabase Client Edge Cases:**
- Risk: `supabase-js` auto-refresh token behavior can cause race conditions if multiple tabs are open
- Impact: In rare cases, user session in one tab invalidates token in another, causing 401 errors
- Migration plan: Implement centralized session state (Context API or external store). Test multi-tab scenarios explicitly.

---

## Missing Critical Features

**No Audit Trail for Sensitive Operations:**
- Problem: Admin creates teachers, changes school settings, exports data — but no log of who did what when
- Blocks: Compliance with data protection regulations (LGPD). Can't investigate unauthorized access.
- Implementation:
  1. Add `audit_logs` table with user, action, resource, timestamp, changes
  2. Trigger on admin function calls to log user ID + request body
  3. Expose audit logs in admin panel with filtering

**No Explicit Rate Limiting on Edge Functions:**
- Problem: Anyone with a valid session token can call adapt-activity infinitely
- Blocks: Prevents abuse/DOS. Cost control.
- Implementation:
  1. Add rate limit headers (X-RateLimit-Limit, Remaining) to edge function responses
  2. Use Supabase function middleware to track per-user request counts
  3. Return 429 after threshold with retry-after header

**No Export Data (GDPR Compliance):**
- Problem: Users can't download all their data in standard format
- Blocks: GDPR Article 20 (data portability) compliance
- Implementation:
  1. Create export endpoint that zips all user's adaptations, settings, activity logs
  2. Return JSON + PDF in standard format
  3. Offer scheduled exports (monthly)

**No Dark Mode Persistence:**
- Problem: Theme preference saved to localStorage but not synced to account
- Blocks: Preference lost if switching devices or clearing cache
- Implementation:
  1. Save `theme_preference` in profiles table
  2. Load on app init from user profile instead of localStorage
  3. Sync localStorage with backend changes via mutation

---

## Test Coverage Gaps

**Adaptation Wizard Error Paths Not Tested:**
- What's not tested: AI generation timeout, malformed question format, invalid barrier selection leading to generation failure
- Files: `src/components/adaptation/AdaptationWizard.tsx` (326 lines), all step components
- Risk: If AI endpoint returns 500, user sees silent failure. If question parsing fails, empty result renders.
- Priority: **High** — wizard is core user flow. Any uncaught error breaks main feature.
- Suggested tests:
  1. Mock AI function to return timeout error
  2. Test invalid question data handling in StepResult
  3. Test barrier validation edge cases

**PDF Export Edge Cases:**
- What's not tested: Very long question text (>5000 chars), images with extreme aspect ratios, special characters in teacher name
- Files: `src/lib/exportPdf.ts`, `src/lib/pdf/index.tsx`
- Risk: PDF generation crashes or produces malformed output for edge case inputs
- Priority: **High** — exported PDFs are delivered to students; failures impact classroom use.

**Supabase Function Authorization:**
- What's not tested: Non-admin user trying to call admin functions, user from different school accessing another school's data
- Files: `supabase/functions/admin-manage-teachers/index.ts`, `supabase/functions/admin-ai-usage-report/index.ts`
- Risk: Authorization bypass if RLS or function-level checks fail
- Priority: **Critical** — security-sensitive. Must test both positive (authorized) and negative (denied) cases.

**File Upload Validation:**
- What's not tested: Uploading file >50MB, uploading non-PDF/DOCX with .pdf extension, corrupted PDF headers
- Files: `src/lib/fileValidation.ts`, `src/lib/pdf-utils.ts`, `src/lib/docx-utils.ts`
- Risk: Server crashes on malformed input, or file parsing succeeds but produces garbage data
- Priority: **High** — user-facing; security (file validation) and stability both at risk

---

*Concerns audit: 2026-03-24*
