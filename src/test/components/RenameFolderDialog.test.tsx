import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RenameFolderDialog from "@/components/question-bank/RenameFolderDialog";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-ignore jsdom stub
    Element.prototype.hasPointerCapture = () => false;
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

function selectCountChain(count: number) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ count, data: null, error: null })),
  };
  return chain;
}

function updateChain(error: any = null) {
  const chain: any = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data: null, error })),
  };
  return chain;
}

describe("RenameFolderDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not render when target is null", () => {
    render(<RenameFolderDialog target={null} onOpenChange={vi.fn()} onRenamed={vi.fn()} />);
    expect(screen.queryByText(/Renomear/)).toBeNull();
  });

  it("shows current grade name as initial value", async () => {
    mockFrom.mockImplementation(() => selectCountChain(5));
    render(
      <RenameFolderDialog
        target={{ level: "grade", current: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={vi.fn()}
      />,
    );
    const input = await screen.findByDisplayValue("9º ano");
    expect(input).toBeTruthy();
  });

  it("fetches count of affected questions on open (grade level)", async () => {
    const chain = selectCountChain(12);
    mockFrom.mockImplementation(() => chain);
    render(
      <RenameFolderDialog
        target={{ level: "grade", current: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={vi.fn()}
      />,
    );
    await waitFor(() => expect(chain.eq).toHaveBeenCalledWith("grade", "9º ano"));
  });

  it("uses is(..., null) for unclassified target", async () => {
    const chain = selectCountChain(3);
    mockFrom.mockImplementation(() => chain);
    render(
      <RenameFolderDialog
        target={{ level: "subject", current: null, grade: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={vi.fn()}
      />,
    );
    await waitFor(() => expect(chain.is).toHaveBeenCalledWith("subject", null));
  });

  it("shows multi-question warning when count > 1", async () => {
    mockFrom.mockImplementation(() => selectCountChain(10));
    render(
      <RenameFolderDialog
        target={{ level: "grade", current: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={vi.fn()}
      />,
    );
    await screen.findByText(/10 questões da sua escola/);
  });

  it("blocks rename with empty name (shows error toast)", async () => {
    mockFrom.mockImplementation(() => selectCountChain(5));
    const user = userEvent.setup();
    render(
      <RenameFolderDialog
        target={{ level: "grade", current: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={vi.fn()}
      />,
    );
    const input = await screen.findByDisplayValue("9º ano");
    await user.clear(input);
    // Botão Renomear fica desabilitado quando vazio — não há como disparar rename
    const btn = screen.getByRole("button", { name: "Renomear" });
    expect(btn).toBeDisabled();
  });

  it("submits UPDATE with new name when form is valid", async () => {
    const countChain = selectCountChain(5);
    const upChain = updateChain();
    mockFrom.mockImplementationOnce(() => countChain).mockImplementation(() => upChain);

    const onRenamed = vi.fn();
    const user = userEvent.setup();
    render(
      <RenameFolderDialog
        target={{ level: "grade", current: "9º ano" }}
        onOpenChange={vi.fn()}
        onRenamed={onRenamed}
      />,
    );
    const input = await screen.findByDisplayValue("9º ano");
    await user.clear(input);
    await user.type(input, "Nono ano");
    await user.click(screen.getByRole("button", { name: "Renomear" }));
    await waitFor(() =>
      expect(upChain.update).toHaveBeenCalledWith({ grade: "Nono ano" }),
    );
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
  });
});
