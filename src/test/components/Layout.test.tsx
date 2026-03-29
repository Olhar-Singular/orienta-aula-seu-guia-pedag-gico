import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

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

const mockUseUserSchool = vi.fn();
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => mockUseUserSchool(),
}));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import Layout from "@/components/Layout";

// ─── Helpers ───

function defaultSchool() {
  return {
    schoolId: "s1",
    schoolName: "Escola Teste",
    schoolCode: "ABC123",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  };
}

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

// ─── Tests ───

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserSchool.mockReturnValue(defaultSchool());
  });

  describe("basic rendering", () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: "teacher", isSuperAdmin: false, isGestor: false,
        isTeacher: true, isActive: true, isLoading: false,
      });
    });

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

  describe("teacher role", () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: "teacher", isSuperAdmin: false, isGestor: false,
        isTeacher: true, isActive: true, isLoading: false,
      });
    });

    it("does NOT show admin items", () => {
      const { queryByText } = renderLayout();
      expect(queryByText("Gestão de Professores")).not.toBeInTheDocument();
      expect(queryByText("Uso de IA")).not.toBeInTheDocument();
      expect(queryByText("Gestão de Escolas")).not.toBeInTheDocument();
    });

    it("shows teacher nav items", () => {
      const { getByText } = renderLayout();
      expect(getByText("Dashboard")).toBeTruthy();
      expect(getByText("Adaptar Atividade")).toBeTruthy();
      expect(getByText("Chat IA")).toBeTruthy();
    });
  });

  describe("gestor role", () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: "gestor", isSuperAdmin: false, isGestor: true,
        isTeacher: false, isActive: true, isLoading: false,
      });
    });

    it("shows teacher nav items (gestor is also a teacher)", () => {
      const { getByText } = renderLayout();
      expect(getByText("Dashboard")).toBeTruthy();
      expect(getByText("Adaptar Atividade")).toBeTruthy();
    });

    it("shows Gestão de Professores", () => {
      const { getByText } = renderLayout();
      expect(getByText("Gestão de Professores")).toBeTruthy();
    });

    it("does NOT show admin-only items", () => {
      const { queryByText } = renderLayout();
      expect(queryByText("Uso de IA")).not.toBeInTheDocument();
      expect(queryByText("Gestão de Escolas")).not.toBeInTheDocument();
    });
  });

  describe("admin role", () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: "admin", isSuperAdmin: true, isGestor: false,
        isTeacher: false, isActive: true, isLoading: false,
      });
    });

    it("does NOT show teacher nav items (admin is NOT a teacher)", () => {
      const { queryByText } = renderLayout();
      expect(queryByText("Dashboard")).not.toBeInTheDocument();
      expect(queryByText("Adaptar Atividade")).not.toBeInTheDocument();
      expect(queryByText("Minhas Adaptações")).not.toBeInTheDocument();
      expect(queryByText("Chat IA")).not.toBeInTheDocument();
      expect(queryByText("Turmas")).not.toBeInTheDocument();
      expect(queryByText("Banco de Questões")).not.toBeInTheDocument();
    });

    it("shows all admin items", () => {
      const { getByText } = renderLayout();
      expect(getByText("Gestão de Professores")).toBeTruthy();
      expect(getByText("Gestão de Escolas")).toBeTruthy();
      expect(getByText("Uso de IA")).toBeTruthy();
    });
  });
});
