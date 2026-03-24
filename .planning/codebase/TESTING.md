# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom (browser DOM simulation)
- Global test API enabled (no need to import `describe`, `it`, `expect`)

**Assertion Library:**
- Vitest built-in assertions (via `expect` from vitest)
- `@testing-library/jest-dom` for DOM matchers (`.toBeTruthy()`, `.toBeInTheDocument()`, etc.)

**Run Commands:**
```bash
npm run test              # Single run with coverage (memory-limited)
npm run test:watch       # Watch mode for development
NODE_OPTIONS='--max-old-space-size=19456' vitest run  # Memory config
```

**Memory Configuration:**
- Tests run with `NODE_OPTIONS='--max-old-space-size=19456'` (19.5GB limit)
- Pool: forks (process-based, more stable than threads)
- Max workers: 4 parallel forks
- Max concurrency per worker: 10 tests

## Test File Organization

**Location:**
- Co-located with source: Tests in `src/test/` mirroring source structure
- Directory structure mirrors `src/`: `src/test/pages/`, `src/test/components/`

**Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `integration-*.test.tsx` (e.g., `integration-adaptation-flow.test.tsx`)
- Page tests: `src/test/pages/PageName.test.tsx`
- Component tests: `src/test/ComponentName.test.tsx`

**Structure:**
```
src/test/
├── helpers.ts              # Mock utilities (mockAuthHook, createTestWrapper, etc.)
├── fixtures.ts             # Mock data (MOCK_USER, MOCK_SESSION, MOCK_ADAPTATION_RESULT)
├── setup.ts                # Global test setup (DOM mocks)
├── pages/                  # Page component tests
│   ├── Login.test.tsx
│   ├── Index.test.tsx
│   └── ...
├── adaptActivity.test.ts
├── integration-adaptation-flow.test.tsx
└── ... (54 total test files)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  it("does something specific", () => {
    // Arrange, Act, Assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- Setup: `beforeEach()` clears mocks, sets up fixtures
- Teardown: `afterEach()` restores all mocks and cleans up
- Assertions: Fluent chain style with `expect().toXxx()`
- Descriptive test names: "renders button", "calls signIn on submit", "shows error message"

## Mocking

**Framework:** Vitest's `vi` module (Sinon-compatible API)

**Patterns:**
```typescript
// Module mocking
vi.mock("@/hooks/useAuth", () => mockAuthHook());

// Function mocking
const mockSignIn = vi.fn().mockResolvedValue({ error: null });

// Return value mocking
mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });

// Clear all mocks
vi.clearAllMocks();

// Restore all mocks
vi.restoreAllMocks();
```

**What to Mock:**
- Authentication hooks: `useAuth()` via `mockAuthHook()` helper
- Supabase client: `@/integrations/supabase/client` via `createSupabaseMock()`
- Navigation: `react-router-dom` methods like `useNavigate()`
- External libraries: `@react-pdf/renderer` (PDF generation returns test blob)
- Global APIs: `fetch` via `mockFetch()` helper for edge functions
- Browser APIs: `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollTo` (in `setup.ts`)

**What NOT to Mock:**
- React and React hooks (render, useState, useEffect)
- UI component libraries (shadcn/ui, Radix primitives)
- Testing Library utilities
- Type definitions or pure utility functions

## Fixtures and Factories

**Test Data:**
Located in `src/test/fixtures.ts` with sections:

```typescript
// ─── User fixtures ───
export const MOCK_USER = {
  id: "user-001",
  email: "professor@escola.com.br",
  user_metadata: { name: "Maria Silva" },
};

// ─── Adaptation result fixtures ───
export const MOCK_ADAPTATION_RESULT: AdaptationResult = {
  version_universal: "...",
  version_directed: "...",
  strategies_applied: [...],
  pedagogical_justification: "...",
  implementation_tips: [...],
};

// ─── Activity texts ───
export const MOCK_ACTIVITY_TEXT = `Leia o texto abaixo...`;
```

**Location:**
- Centralized in `src/test/fixtures.ts`
- Grouped by entity type with `// ─── Section ───` comments
- Reused across all tests to ensure data consistency
- Includes edge cases: `MOCK_CORRUPTED_LATEX`, `MOCK_UNICODE_MATH`

## Coverage

**Requirements:**
- Statements: 60% (enforced by Vitest)
- Branches: 55% (enforced)
- Functions: 60% (enforced)
- Lines: 60% (enforced)

**View Coverage:**
```bash
npm run test  # Generates coverage report after run
# Output: ./coverage/ (HTML, LCOV, text formats)
```

**Excluded from Coverage:**
- `src/test/` (test helpers themselves)
- `src/**/*.test.{ts,tsx}` (test files)
- `src/integrations/supabase/types.ts` (auto-generated)
- `src/vite-env.d.ts` (Vite type declarations)
- `src/main.tsx` (app entry point)

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, hooks
- Approach: Test one piece of logic in isolation with mocked dependencies
- Example: `src/test/adaptActivity.test.ts` tests sanitization logic and validation

**Integration Tests:**
- Scope: Multi-step workflows across components and services
- Approach: Use `createTestWrapper()` to provide QueryClient and Router context
- Example: `integration-adaptation-flow.test.tsx` tests wizard flow from Step 1 → Step 5
- Naming convention: `integration-*.test.tsx`

**E2E Tests:**
- Framework: Not used
- Strategy: Rely on integration tests for flow coverage

## Common Patterns

**Rendering Components:**
```typescript
function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Login Page", () => {
  it("renders form", () => {
    const { getByLabelText } = renderLogin();
    expect(getByLabelText("E-mail")).toBeTruthy();
  });
});
```

**Using Test Wrapper Helper:**
```typescript
const Wrapper = createTestWrapper("/dashboard/adaptar");
const { getByText } = render(<AdaptationWizard />, { wrapper: Wrapper });
```

**Async Testing:**
```typescript
it("calls signIn on form submit", async () => {
  const { getByLabelText, getByRole } = renderLogin();
  fireEvent.change(getByLabelText("E-mail"), { target: { value: "test@mail.com" } });
  fireEvent.click(getByRole("button", { name: "Entrar" }));
  // Async assertions after user interaction
  expect(mockSignIn).toHaveBeenCalledWith("test@mail.com", "password");
});
```

**Error Testing:**
```typescript
it("validates barriers array structure", () => {
  const validBarriers = [
    { dimension: "processamento", barrier_key: "key" },
  ];
  expect(Array.isArray(validBarriers)).toBe(true);
  validBarriers.forEach((b) => {
    expect(b).toHaveProperty("dimension");
    expect(typeof b.dimension).toBe("string");
  });
});
```

**DOM Queries:**
- `.getByText()` - Find by text content
- `.getByLabelText()` - Find form fields by label
- `.getByRole()` - Find by semantic role
- `.container.querySelector()` - CSS selector fallback
- `.getByLabelText()` combines label association

## Helper Functions

**From `src/test/helpers.ts`:**

**mockAuthHook()** - Returns mocked useAuth hook and AuthProvider:
```typescript
export function mockAuthHook(overrides = {}) {
  return {
    useAuth: () => ({
      user: MOCK_USER,
      session: MOCK_SESSION,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      ...overrides,
    }),
    AuthProvider: ({ children }) => children,
  };
}
```

**createSupabaseMock()** - Returns chainable Supabase query mocks:
```typescript
export function createSupabaseMock(tableResponses = {}) {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (tableResponses[table]) {
          return createChainableQuery(tableResponses[table]);
        }
        return createChainableQuery(null);
      }),
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
      auth: { onAuthStateChange: vi.fn(...), getSession: vi.fn(...) },
    },
  };
}
```

**createTestWrapper()** - Returns wrapper component with QueryClient + Router:
```typescript
export function createTestWrapper(initialRoute = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function TestWrapper({ children }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [initialRoute] }, children)
    );
  };
}
// Usage: <render component={{ wrapper: TestWrapper }} />
```

**mockFetch()** - Mocks global fetch for edge function calls:
```typescript
export function mockFetch(responses = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const endpoint = Object.keys(responses).find((key) => url.includes(key));
    // Returns response object with .json() and .text() methods
  });
  globalThis.fetch = fetchMock;
  return fetchMock;
}
```

## Global Setup

**File:** `src/test/setup.ts`

**Mocks:**
- `window.matchMedia` - Returns object with listener methods
- `global.ResizeObserver` - Mocked observer with observe/unobserve
- `global.IntersectionObserver` - Mocked observer
- `window.scrollTo` - No-op function
- `URL.createObjectURL` - Returns `"blob:test"`
- `URL.revokeObjectURL` - No-op

---

*Testing analysis: 2026-03-24*
