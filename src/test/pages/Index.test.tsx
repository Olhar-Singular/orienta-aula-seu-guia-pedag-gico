import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock framer-motion
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

import Index from "@/pages/Index";

function renderIndex() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Landing page (Index)", () => {
  it("renders a single h1", () => {
    const { container } = renderIndex();
    const h1s = container.querySelectorAll("h1");
    expect(h1s.length).toBe(1);
  });

  it("renders CTA buttons", () => {
    const { container } = renderIndex();
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders 3 'Como Funciona' steps", () => {
    const { getByText } = renderIndex();
    expect(getByText("Selecione as barreiras")).toBeTruthy();
    expect(getByText(/Cole/)).toBeTruthy();
    expect(getByText("Receba a adaptação")).toBeTruthy();
  });

  it("has alt text on images", () => {
    const { container } = renderIndex();
    const images = container.querySelectorAll("img");
    images.forEach((img) => {
      expect(img.getAttribute("alt")).toBeTruthy();
    });
  });

  it("has footer", () => {
    const { container } = renderIndex();
    const footer = container.querySelector("footer");
    expect(footer).toBeTruthy();
  });

  it("has nav element", () => {
    const { container } = renderIndex();
    const nav = container.querySelector("nav");
    expect(nav).toBeTruthy();
  });

  it("has main-content id target", () => {
    const { container } = renderIndex();
    const main = container.querySelector("#main-content");
    expect(main).toBeTruthy();
  });
});
