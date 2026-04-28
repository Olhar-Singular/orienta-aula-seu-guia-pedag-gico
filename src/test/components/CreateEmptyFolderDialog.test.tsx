import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateEmptyFolderDialog from "@/components/question-bank/CreateEmptyFolderDialog";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-expect-error jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    // @ts-expect-error jsdom stub
    Element.prototype.scrollIntoView = () => {};
  }
});

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

function insertChain(error: any = null) {
  const chain: any = {
    insert: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data: null, error })),
  };
  return chain;
}

describe("CreateEmptyFolderDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders dialog when open", () => {
    render(
      <CreateEmptyFolderDialog
        open={true}
        onOpenChange={vi.fn()}
        schoolId="s1"
        userId="u1"
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("Nova pasta")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(
      <CreateEmptyFolderDialog
        open={false}
        onOpenChange={vi.fn()}
        schoolId="s1"
        userId="u1"
        onCreated={vi.fn()}
      />,
    );
    expect(screen.queryByText("Nova pasta")).toBeNull();
  });

  it("shows validation toast when both grade and subject are empty", async () => {
    const user = userEvent.setup();
    render(
      <CreateEmptyFolderDialog
        open={true}
        onOpenChange={vi.fn()}
        schoolId="s1"
        userId="u1"
        onCreated={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/série ou matéria/i) }),
    );
  });

  it("does not insert when userId is null", async () => {
    const user = userEvent.setup();
    render(
      <CreateEmptyFolderDialog
        open={true}
        onOpenChange={vi.fn()}
        schoolId="s1"
        userId={null}
        onCreated={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("shows 'pasta já existe' toast on unique constraint error", async () => {
    const ins: any = insertChain({ code: "23505", message: "duplicate" });
    mockFrom.mockImplementation(() => ins);
    const user = userEvent.setup();

    // Render, set a grade via "Outro"
    render(
      <CreateEmptyFolderDialog
        open={true}
        onOpenChange={vi.fn()}
        schoolId="s1"
        userId="u1"
        onCreated={vi.fn()}
      />,
    );
    // Stub a grade pela via "Outro" usando value da propriedade do GradeSelect — vamos simular
    // preenchendo um valor não canônico no campo livre (quando o select tem modo "other")
    // Mais simples: atacar internamente via simulação de clique no combobox
    // Para simplificar, vamos criar o cenário acionando "Outro" pelo combobox
    const combos = screen.getAllByRole("combobox");
    await user.click(combos[0]);
    await user.click(await screen.findByRole("option", { name: /Outro/ }));
    const input = await screen.findByPlaceholderText(/Curso técnico/);
    await user.type(input, "Curso X");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Pasta já existe" }),
      ),
    );
  });
});
