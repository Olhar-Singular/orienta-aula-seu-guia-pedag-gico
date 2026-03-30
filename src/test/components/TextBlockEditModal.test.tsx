import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextBlockEditModal from "@/components/adaptation/TextBlockEditModal";

vi.mock("@/components/QuestionRichEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  textToHtml: (t: string) => t,
  htmlToText: (t: string) => t,
}));

describe("TextBlockEditModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    initialText: "Texto inicial",
    onSave: vi.fn(),
  };

  it("renders dialog with title when open", () => {
    render(<TextBlockEditModal {...defaultProps} />);
    expect(screen.getByText("Editar texto")).toBeInTheDocument();
  });

  it("shows initial text in textarea", () => {
    render(<TextBlockEditModal {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Texto inicial");
  });

  it("calls onSave with trimmed text when Salvar is clicked", () => {
    const onSave = vi.fn();
    render(<TextBlockEditModal {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "  Novo texto  " } });
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).toHaveBeenCalledWith("Novo texto");
  });

  it("calls onOpenChange(false) when Cancelar is clicked", () => {
    const onOpenChange = vi.fn();
    render(<TextBlockEditModal {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) after saving", () => {
    const onOpenChange = vi.fn();
    render(<TextBlockEditModal {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Salvar"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render content when closed", () => {
    render(<TextBlockEditModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Editar texto")).not.toBeInTheDocument();
  });

  it("updates textarea value on input", () => {
    render(<TextBlockEditModal {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Texto editado" } });
    expect(textarea).toHaveValue("Texto editado");
  });
});
