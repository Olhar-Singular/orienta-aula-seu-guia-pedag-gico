import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import RecuperarSenha from "@/pages/RecuperarSenha";

function renderPage() {
  return render(
    <MemoryRouter>
      <RecuperarSenha />
    </MemoryRouter>
  );
}

describe("RecuperarSenha Page", () => {
  it("renders title", () => {
    const { getByText } = renderPage();
    expect(getByText("Recuperar senha")).toBeTruthy();
  });

  it("renders email field", () => {
    const { getByLabelText } = renderPage();
    expect(getByLabelText("E-mail")).toBeTruthy();
  });

  it("renders submit button", () => {
    const { getByText } = renderPage();
    expect(getByText("Enviar link de recuperação")).toBeTruthy();
  });

  it("renders back to login link", () => {
    const { getByText } = renderPage();
    expect(getByText("Voltar ao login")).toBeTruthy();
  });
});
