import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const mockUser = { id: "u1", email: "test@test.com", user_metadata: {} };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          name: "Prof Test",
          role: "professor",
          main_subject: "Matemática",
          education_level: "fundamental2",
          output_preference: "ambos",
        },
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

import Profile from "@/pages/Profile";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Profile Page", () => {
  it("renders page title", () => {
    const { getByText } = renderPage();
    expect(getByText("Meu Perfil")).toBeTruthy();
  });

  it("renders personal data card", () => {
    const { getByText } = renderPage();
    expect(getByText("Dados pessoais")).toBeTruthy();
  });

  it("renders name field", () => {
    const { getByText } = renderPage();
    expect(getByText("Nome")).toBeTruthy();
  });

  it("renders email field (disabled)", () => {
    const { getByDisplayValue } = renderPage();
    expect(getByDisplayValue("test@test.com")).toBeTruthy();
  });

  it("renders save button", () => {
    const { getByText } = renderPage();
    expect(getByText("Salvar alterações")).toBeTruthy();
  });

  it("renders logout section", () => {
    const { getByText } = renderPage();
    expect(getByText("Sair da conta")).toBeTruthy();
  });

  it("renders disclaimer", () => {
    const { getByText } = renderPage();
    expect(getByText(/Ferramenta pedagógica/)).toBeTruthy();
  });
});
