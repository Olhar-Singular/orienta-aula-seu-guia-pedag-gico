import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import NotFound from "@/pages/NotFound";

function renderPage(path = "/unknown") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFound />
    </MemoryRouter>
  );
}

describe("NotFound Page", () => {
  it("renders 404 text", () => {
    const { getByText } = renderPage();
    expect(getByText("404")).toBeTruthy();
  });

  it("renders page title", () => {
    const { getByText } = renderPage();
    expect(getByText("Página não encontrada")).toBeTruthy();
  });

  it("shows the current path", () => {
    const { getByText } = renderPage("/invalid-path");
    expect(getByText("/invalid-path")).toBeTruthy();
  });

  it("renders home button", () => {
    const { getByText } = renderPage();
    expect(getByText("Página inicial")).toBeTruthy();
  });

  it("renders back button", () => {
    const { getByText } = renderPage();
    expect(getByText("Voltar")).toBeTruthy();
  });
});
