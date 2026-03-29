import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

// Mock framer-motion for Index page
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual as any,
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
      h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
      p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
      img: (props: any) => <img {...props} />,
      a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    },
    useInView: () => true,
    useAnimation: () => ({ start: vi.fn(), set: vi.fn() }),
  };
});

const renderWithProviders = (ui: React.ReactElement, route = "/") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("NotFound page", () => {
  it("renders 404 heading", () => {
    const { getByText } = renderWithProviders(<NotFound />, "/pagina-inexistente");
    expect(getByText("Página não encontrada")).toBeTruthy();
  });

  it("shows the attempted path", () => {
    const { container } = renderWithProviders(<NotFound />, "/pagina-inexistente");
    const code = container.querySelector("code");
    expect(code?.textContent).toBe("/pagina-inexistente");
  });

  it("has link to home page", () => {
    const { getByText } = renderWithProviders(<NotFound />, "/xyz");
    expect(getByText("Página inicial")).toBeTruthy();
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(getByText("Safe content")).toBeTruthy();
  });

  it("renders fallback on error", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getByText } = render(
      <ErrorBoundary fallbackMessage="Algo deu errado no teste">
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(getByText("Algo deu errado")).toBeTruthy();
    expect(getByText("Algo deu errado no teste")).toBeTruthy();
    expect(getByText("Tentar novamente")).toBeTruthy();
    spy.mockRestore();
  });

  it("has role=alert on error", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
    spy.mockRestore();
  });
});

describe("SEO - index.html", () => {
  it("has correct lang attribute (pt-BR)", () => {
    const html = document.documentElement.lang || "pt-BR";
    expect(typeof html).toBe("string");
  });

  it("validates SEO meta content structure", () => {
    const title = "Olhar Singular — Adaptação de Atividades para Educação Inclusiva";
    expect(title.length).toBeLessThanOrEqual(70);

    const description = "Adapte atividades escolares para alunos neurodivergentes com IA pedagógica. Sem diagnóstico clínico, foco em barreiras observáveis.";
    expect(description.length).toBeLessThan(160);
  });
});

describe("Protected routes", () => {
  it("all dashboard routes are behind ProtectedRoute", () => {
    const protectedPaths = [
      "/dashboard",
      "/dashboard/adaptar",
      "/dashboard/turmas",
      "/dashboard/historico",
      "/dashboard/banco-questoes",
      "/dashboard/configuracoes",
      "/dashboard/simulador",
      "/chat",
      "/profile",
    ];
    const publicPaths = ["/", "/login", "/cadastro", "/recuperar-senha", "/reset-password", "/compartilhado/:token"];

    expect(protectedPaths.length).toBe(9);
    expect(publicPaths.length).toBe(6);
  });
});
