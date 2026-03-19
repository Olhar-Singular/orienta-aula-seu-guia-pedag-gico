import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb: any) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import ResetPassword from "@/pages/ResetPassword";

function renderPage() {
  return render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe("ResetPassword Page", () => {
  it("renders invalid link message when not in recovery mode", () => {
    const { getByText } = renderPage();
    expect(getByText("Link de recuperação inválido ou expirado.")).toBeTruthy();
  });

  it("renders request new link button", () => {
    const { getByText } = renderPage();
    expect(getByText("Solicitar novo link")).toBeTruthy();
  });
});
