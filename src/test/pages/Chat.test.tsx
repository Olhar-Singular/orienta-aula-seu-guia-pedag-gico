import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", user_metadata: {} },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
    })),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("@/lib/streamAI", () => ({
  streamAI: vi.fn(),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

import Chat from "@/pages/Chat";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Chat />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Chat Page", () => {
  it("renders chat title", () => {
    const { getByText } = renderPage();
    expect(getByText("Chat com IA")).toBeTruthy();
  });

  it("renders welcome message", () => {
    const { getByText } = renderPage();
    expect(getByText(/assistente pedagógico/)).toBeTruthy();
  });

  it("renders input field", () => {
    const { getByPlaceholderText } = renderPage();
    expect(getByPlaceholderText("Digite sua dúvida pedagógica...")).toBeTruthy();
  });

  it("renders quick chips when no messages", () => {
    const { getByText } = renderPage();
    expect(getByText("Como adaptar uma prova de matemática?")).toBeTruthy();
  });

  it("renders conversations sidebar title", () => {
    const { getByText } = renderPage();
    expect(getByText("Conversas")).toBeTruthy();
  });

  it("renders empty conversations message", () => {
    const { getByText } = renderPage();
    expect(getByText("Nenhuma conversa ainda")).toBeTruthy();
  });
});
