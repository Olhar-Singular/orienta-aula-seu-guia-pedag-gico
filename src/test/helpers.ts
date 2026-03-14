import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { createElement } from "react";
import { MOCK_USER, MOCK_SESSION } from "./fixtures";

/**
 * Creates a standard mock for @/hooks/useAuth
 */
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
    AuthProvider: ({ children }: { children: ReactNode }) => children,
  };
}

/**
 * Creates a standard mock for @/hooks/useSubscription (no-op, credits removed)
 */
export function mockSubscriptionHook(overrides = {}) {
  return {
    useSubscription: () => ({
      loading: false,
      ...overrides,
    }),
  };
}

/**
 * Chainable Supabase query mock builder
 */
export function createChainableQuery(resolvedData: any = null, error: any = null) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "ilike", "like", "not",
    "order", "limit", "range", "single", "maybeSingle",
    "count", "head", "then",
  ];

  methods.forEach((m) => {
    if (m === "single" || m === "maybeSingle") {
      chain[m] = vi.fn(() => Promise.resolve({ data: resolvedData, error, count: Array.isArray(resolvedData) ? resolvedData.length : (resolvedData ? 1 : 0) }));
    } else if (m === "then") {
      chain[m] = vi.fn((resolve: any) => resolve({ data: resolvedData, error, count: Array.isArray(resolvedData) ? resolvedData.length : 0 }));
    } else {
      chain[m] = vi.fn(() => chain);
    }
  });

  return chain;
}

/**
 * Creates a Supabase client mock with configurable table responses
 */
export function createSupabaseMock(tableResponses: Record<string, any> = {}) {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (tableResponses[table]) {
          return createChainableQuery(tableResponses[table]);
        }
        return createChainableQuery(null);
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getSession: vi.fn(() =>
          Promise.resolve({ data: { session: MOCK_SESSION } })
        ),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
}

/**
 * Standard wrapper for rendering components under test
 */
export function createTestWrapper(initialRoute = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [initialRoute] }, children)
    );
  };
}

/**
 * Mock global fetch for edge function calls
 */
export function mockFetch(responses: Record<string, any> = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const endpoint = Object.keys(responses).find((key) => url.includes(key));
    if (endpoint) {
      const responseData = responses[endpoint];
      return {
        ok: !responseData._error,
        status: responseData._error ? 400 : 200,
        json: () => Promise.resolve(responseData._error ? { error: responseData._error } : responseData),
        text: () => Promise.resolve(JSON.stringify(responseData)),
      } as Response;
    }
    return { ok: false, status: 404, json: () => Promise.resolve({ error: "Not found" }) } as any;
  });

  globalThis.fetch = fetchMock as any;
  return fetchMock;
}
