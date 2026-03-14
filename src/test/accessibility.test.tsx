import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    renderLayout();
    const skipLink = screen.getByText("Pular para o conteúdo");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveClass("skip-to-content");
  });

  it("has main element with role=main", () => {
    renderLayout();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("sidebar nav has aria-label", () => {
    renderLayout();
    const navs = screen.getAllByRole("navigation");
    const dashboardNav = navs.find((n) => n.getAttribute("aria-label")?.includes("Navegação"));
    expect(dashboardNav).toBeTruthy();
  });

  it("mobile menu button has aria-label", () => {
    renderLayout();
    const menuBtn = screen.getByLabelText(/menu/i);
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("logout button has aria-label", () => {
    renderLayout();
    const logoutBtns = screen.getAllByLabelText("Sair da conta");
    expect(logoutBtns.length).toBeGreaterThan(0);
  });

  it("marks active route with aria-current=page", () => {
    renderLayout("/dashboard");
    const activeLinks = screen.getAllByText("Dashboard");
    const linkWithAria = activeLinks.find(
      (el) => el.closest("a")?.getAttribute("aria-current") === "page"
    );
    expect(linkWithAria).toBeTruthy();
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
    renderLayout();
    const aside = screen.getByRole("navigation", { name: /Menu principal/i });
    expect(aside).toHaveClass("hidden", "lg:flex");
  });

  it("main content has responsive padding", () => {
    renderLayout();
    const main = screen.getByRole("main");
    const innerDiv = main.querySelector("div");
    expect(innerDiv?.className).toContain("p-4");
    expect(innerDiv?.className).toContain("sm:p-6");
    expect(innerDiv?.className).toContain("lg:p-8");
  });
});
