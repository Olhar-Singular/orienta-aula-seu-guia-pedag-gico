import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: { name: "Test" } }, signOut: vi.fn() }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock CreditsBadge
vi.mock("@/components/CreditsBadge", () => ({
  default: () => <div data-testid="credits-badge">Credits</div>,
}));

import Layout from "@/components/Layout";

const renderLayout = (route = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Layout>
        <div data-testid="page-content">Content</div>
      </Layout>
    </MemoryRouter>
  );

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
    const { getByLabelText } = renderLayout();
    const menuBtn = getByLabelText(/menu/i);
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute("aria-expanded", "false");
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
    expect(innerDiv?.className).toContain("p-4");
    expect(innerDiv?.className).toContain("sm:p-6");
    expect(innerDiv?.className).toContain("lg:p-8");
  });
});
