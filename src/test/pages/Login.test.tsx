import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockNavigate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signIn: mockSignIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

import Login from "@/pages/Login";

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Login Page", () => {
  it("renders login form with email and password fields", () => {
    const { getByLabelText, getByRole } = renderLogin();
    expect(getByLabelText("E-mail")).toBeInTheDocument();
    expect(getByLabelText("Senha")).toBeInTheDocument();
    expect(getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("renders card title", () => {
    const { getByText } = renderLogin();
    expect(getByText("Entrar")).toBeTruthy();
    expect(getByText("Acesse sua conta para continuar")).toBeTruthy();
  });

  it("renders forgot password link", () => {
    const { getByText } = renderLogin();
    expect(getByText("Esqueceu a senha?")).toBeTruthy();
  });

  it("calls signIn on form submit", async () => {
    const { getByLabelText, getByRole } = renderLogin();
    
    fireEvent.change(getByLabelText("E-mail"), { target: { value: "test@test.com" } });
    fireEvent.change(getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.submit(getByRole("form") || getByLabelText("E-mail").closest("form")!);

    // Wait for async
    await vi.waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@test.com", "password123");
    });
  });
});
