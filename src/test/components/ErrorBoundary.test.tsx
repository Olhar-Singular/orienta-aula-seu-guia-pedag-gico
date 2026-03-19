import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

function ThrowingComponent(): JSX.Element {
  throw new Error("Test error");
}

function GoodComponent() {
  return <div>Everything is fine</div>;
}

describe("ErrorBoundary", () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary><GoodComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText("Everything is fine")).toBeTruthy();
  });

  it("renders fallback when child throws", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText("Algo deu errado")).toBeTruthy();
  });

  it("shows custom fallback message", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary fallbackMessage="Custom error message">
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText("Custom error message")).toBeTruthy();
  });

  it("shows default fallback message when no custom message", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText(/Ocorreu um erro inesperado/)).toBeTruthy();
  });

  it("renders retry button", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText("Tentar novamente")).toBeTruthy();
  });

  it("renders reload button", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(getByText("Recarregar página")).toBeTruthy();
  });

  it("has alert role for accessibility", () => {
    const { container } = render(
      <MemoryRouter>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });
});
