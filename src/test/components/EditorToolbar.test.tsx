import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditorToolbar from "@/components/editor/EditorToolbar";

const defaultProps = {
  onInsert: vi.fn(),
  onFormat: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
};

describe("EditorToolbar", () => {
  it("renders image button when onImageClick is provided", () => {
    render(<EditorToolbar {...defaultProps} onImageClick={vi.fn()} />);
    expect(screen.getByTitle("Adicionar imagens")).toBeInTheDocument();
  });

  it("does not render image button when onImageClick is not provided", () => {
    render(<EditorToolbar {...defaultProps} />);
    expect(screen.queryByTitle("Adicionar imagens")).toBeNull();
  });

  it("calls onImageClick when image button is clicked", () => {
    const onImageClick = vi.fn();
    render(<EditorToolbar {...defaultProps} onImageClick={onImageClick} />);
    fireEvent.click(screen.getByTitle("Adicionar imagens"));
    expect(onImageClick).toHaveBeenCalledOnce();
  });
});
