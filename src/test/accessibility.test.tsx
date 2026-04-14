import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: { name: "Test" } }, signOut: vi.fn() }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

import Layout from "@/components/Layout";

const renderLayout = (route = "/dashboard") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Layout>
          <div data-testid="page-content">Content</div>
        </Layout>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Layout accessibility", () => {
  it("renders skip-to-content link", () => {
    const { getByText } = renderLayout();
    const skipLink = getByText("Pular para o conteúdo");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveClass("skip-to-content");
  });

  it("has main element with role=main", () => {
    const { getByRole } = renderLayout();
    expect(getByRole("main")).toBeInTheDocument();
  });

  it("sidebar nav has aria-label", () => {
    const { getAllByRole } = renderLayout();
    const navs = getAllByRole("navigation");
    const dashboardNav = navs.find((n) => n.getAttribute("aria-label")?.includes("Navegação"));
    expect(dashboardNav).toBeTruthy();
  });

  it("mobile menu button has aria-label", () => {
    const { getAllByLabelText } = renderLayout();
    const menuBtns = getAllByLabelText(/menu/i);
    expect(menuBtns.length).toBeGreaterThan(0);
    // At least one should be a button
    const btn = menuBtns.find((el) => el.tagName === "BUTTON");
    expect(btn).toBeTruthy();
  });

  it("logout button has aria-label", () => {
    const { getAllByLabelText } = renderLayout();
    const logoutBtns = getAllByLabelText("Sair da conta");
    expect(logoutBtns.length).toBeGreaterThan(0);
  });

  it("marks active route with aria-current=page", () => {
    const { container } = renderLayout("/dashboard");
    const activeLinks = container.querySelectorAll('[aria-current="page"]');
    expect(activeLinks.length).toBeGreaterThan(0);
  });

  it("has aria-live region for announcements", () => {
    renderLayout();
    const liveRegion = document.getElementById("live-announcer");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });
});

describe("Layout responsiveness", () => {
  it("sidebar is hidden on mobile via CSS class", () => {
    const { container } = renderLayout();
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("lg:flex");
  });

  it("main content has responsive padding", () => {
    const { getByRole } = renderLayout();
    const main = getByRole("main");
    const innerDiv = main.querySelector("div");
    expect(innerDiv?.className).toContain("px-3");
    expect(innerDiv?.className).toContain("sm:px-4");
    expect(innerDiv?.className).toContain("lg:px-6");
  });
});
