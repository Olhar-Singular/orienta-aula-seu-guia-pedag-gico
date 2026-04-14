import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import InlineTextEditor from "@/components/adaptation/pdf-preview/InlineTextEditor";

describe("InlineTextEditor — read-only text, style-only edits", () => {
  it("renders the editor area as non-editable (contenteditable=false)", async () => {
    render(
      <InlineTextEditor content="Texto inicial" onChange={vi.fn()} />,
      { wrapper: createTestWrapper() },
    );

    // TipTap's ProseMirror surface ends up as a div with `contenteditable`.
    // Wait for editor to mount.
    let editable: HTMLElement | null = null;
    for (let i = 0; i < 20 && !editable; i++) {
      await new Promise((r) => setTimeout(r, 10));
      editable = document.querySelector(".ProseMirror");
    }
    expect(editable).not.toBeNull();
    expect(editable!.getAttribute("contenteditable")).toBe("false");
  });

  it("does not call onChange when the user attempts to type into the surface", async () => {
    const onChange = vi.fn();
    render(
      <InlineTextEditor content="Texto inicial" onChange={onChange} />,
      { wrapper: createTestWrapper() },
    );

    let editable: HTMLElement | null = null;
    for (let i = 0; i < 20 && !editable; i++) {
      await new Promise((r) => setTimeout(r, 10));
      editable = document.querySelector(".ProseMirror");
    }
    expect(editable).not.toBeNull();

    // Simulate typing: with contenteditable=false, no text mutation should occur.
    fireEvent.keyDown(editable!, { key: "a", code: "KeyA" });
    fireEvent.input(editable!, { data: "a" });

    expect(onChange).not.toHaveBeenCalled();
  });
});
