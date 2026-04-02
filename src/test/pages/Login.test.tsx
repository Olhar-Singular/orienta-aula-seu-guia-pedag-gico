import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor, act } from "@testing-library/react";
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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import Login from "@/pages/Login";
import { toast } from "sonner";

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

function fillAndSubmit(email = "test@test.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));
}

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it("renders login form with email and password fields", () => {
    renderLogin();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeInTheDocument();
  });

  it("renders card title", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
  });

  it("renders forgot password link", () => {
    renderLogin();
    expect(screen.getByText("Esqueceu a senha?")).toBeTruthy();
  });

  it("calls signIn on form submit", async () => {
    renderLogin();
    fillAndSubmit();
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@test.com", "password123");
    });
  });

  it("shows toast error for 'Invalid login credentials'", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    renderLogin();
    fillAndSubmit();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("E-mail ou senha incorretos.");
    });
  });

  it("shows toast error for error message containing 'credentials' without 'Invalid login'", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Wrong credentials provided" } });
    renderLogin();
    fillAndSubmit();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("E-mail ou senha incorretos.");
    });
  });

  it("shows toast error for 'Email not confirmed'", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Email not confirmed" } });
    renderLogin();
    fillAndSubmit();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
      );
    });
  });

  it("shows raw error message for unknown error types", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Unexpected error occurred" } });
    renderLogin();
    fillAndSubmit();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Unexpected error occurred");
    });
  });

  it("does not call signIn twice if already loading (double submit prevention)", async () => {
    let resolveSignIn: (v: any) => void;
    mockSignIn.mockImplementation(() => new Promise((res) => { resolveSignIn = res; }));

    renderLogin();
    fillAndSubmit();
    // Try submitting again while first is in flight
    fireEvent.click(screen.getByRole("button", { name: /Aguarde/i }));

    resolveSignIn!({ error: null });
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles password visibility when eye button is clicked", () => {
    renderLogin();
    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /Exibir senha/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /Ocultar senha/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows toast error when both fields are empty", async () => {
    renderLogin();
    // Use fireEvent.submit to bypass HTML5 native required validation
    fireEvent.submit(screen.getByRole("button", { name: /Entrar/i }).closest("form")!);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Preencha todos os campos.");
    });
  });
});
