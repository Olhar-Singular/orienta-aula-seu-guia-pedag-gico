import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", user_metadata: { name: "Test" } },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({
    schoolId: "s1",
    schoolName: "Escola Teste",
    schoolCode: "ABC123",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import Layout from "@/components/Layout";

function renderLayout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Layout><div>Test Content</div></Layout>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Layout", () => {
  it("renders navigation", () => {
    const { container } = renderLayout();
    expect(container.querySelector('[role="navigation"]')).toBeTruthy();
  });

  it("renders children content", () => {
    const { getByText } = renderLayout();
    expect(getByText("Test Content")).toBeTruthy();
  });

  it("renders dashboard link", () => {
    const { getByText } = renderLayout();
    expect(getByText("Dashboard")).toBeTruthy();
  });

  it("renders adaptar link", () => {
    const { getByText } = renderLayout();
    expect(getByText("Adaptar Atividade")).toBeTruthy();
  });

  it("renders chat link", () => {
    const { getByText } = renderLayout();
    expect(getByText("Chat IA")).toBeTruthy();
  });

  it("renders logout button", () => {
    const { getByLabelText } = renderLayout();
    expect(getByLabelText("Sair da conta")).toBeTruthy();
  });

  it("renders skip to content link", () => {
    const { getByText } = renderLayout();
    expect(getByText("Pular para o conteúdo")).toBeTruthy();
  });

  it("renders disclaimer text", () => {
    const { getByText } = renderLayout();
    expect(getByText(/Ferramenta pedagógica/)).toBeTruthy();
  });
});
