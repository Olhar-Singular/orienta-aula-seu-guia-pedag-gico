import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GradeSelect from "@/components/question-bank/GradeSelect";

// jsdom não implementa hasPointerCapture — stub para Radix Select
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-ignore jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    // @ts-ignore jsdom stub
    Element.prototype.scrollIntoView = () => {};
  }
});

describe("GradeSelect", () => {
  it("renders with label", () => {
    render(<GradeSelect value={null} onChange={vi.fn()} />);
    expect(screen.getByText("Série")).toBeTruthy();
  });

  it("renders custom label", () => {
    render(<GradeSelect value={null} onChange={vi.fn()} label="Ano escolar" />);
    expect(screen.getByText("Ano escolar")).toBeTruthy();
  });

  it("initializes in 'other' mode when value is not canonical", () => {
    render(<GradeSelect value="Curso Livre" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Curso técnico/) as HTMLInputElement;
    expect(input.value).toBe("Curso Livre");
  });

  it("does not show free-text input for canonical value", () => {
    render(<GradeSelect value="9º ano" onChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/Curso técnico/)).toBeNull();
  });

  it("does not show free-text input for null value", () => {
    render(<GradeSelect value={null} onChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/Curso técnico/)).toBeNull();
  });

  it("typing in free-text input calls onChange with trimmed value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<GradeSelect value="Curso Antigo" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/Curso técnico/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "EJA 1");
    expect(onChange).toHaveBeenLastCalledWith("EJA 1");
  });

  it("emits null when free-text input is cleared", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<GradeSelect value="Curso X" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/Curso técnico/);
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
