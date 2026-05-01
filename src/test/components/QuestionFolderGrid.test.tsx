import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionFolderGrid from "@/components/question-bank/QuestionFolderGrid";
import type { Folder } from "@/lib/questionFolders";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-expect-error jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
});

const f9: Folder = { key: "9º ano", label: "9º ano", count: 5, lastAt: "2026-04-01T00:00:00Z", isEmpty: false };
const f1: Folder = { key: "1º ano", label: "1º ano", count: 3, lastAt: null, isEmpty: false };
const fEmpty: Folder = { key: "7º ano", label: "7º ano", count: 0, lastAt: null, isEmpty: true };

describe("QuestionFolderGrid", () => {
  it("renders folders in natural grade order when no prefs", () => {
    render(
      <QuestionFolderGrid folders={[f9, f1]} prefs={[]} level="grade" onOpen={vi.fn()} />,
    );
    const cards = screen.getAllByRole("button", { name: /Abrir pasta/ });
    expect(cards[0]).toHaveTextContent("1º ano");
    expect(cards[1]).toHaveTextContent("9º ano");
  });

  it("renders folders with prefs order", () => {
    render(
      <QuestionFolderGrid
        folders={[f1, f9]}
        prefs={[
          { folder_key: "grade:9º ano", display_order: 0 },
          { folder_key: "grade:1º ano", display_order: 1 },
        ]}
        level="grade"
        onOpen={vi.fn()}
      />,
    );
    const cards = screen.getAllByRole("button", { name: /Abrir pasta/ });
    expect(cards[0]).toHaveTextContent("9º ano");
    expect(cards[1]).toHaveTextContent("1º ano");
  });

  it("renders question count", () => {
    render(
      <QuestionFolderGrid folders={[f9]} prefs={[]} level="grade" onOpen={vi.fn()} />,
    );
    expect(screen.getByText("5 questões")).toBeTruthy();
  });

  it("renders 'Vazia' badge for empty folders", () => {
    render(
      <QuestionFolderGrid folders={[fEmpty]} prefs={[]} level="grade" onOpen={vi.fn()} />,
    );
    expect(screen.getByText("Vazia")).toBeTruthy();
  });

  it("clicking a card calls onOpen with the folder", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionFolderGrid folders={[f9]} prefs={[]} level="grade" onOpen={onOpen} />,
    );
    await user.click(screen.getByRole("button", { name: /Abrir pasta/ }));
    expect(onOpen).toHaveBeenCalledWith(f9);
  });

  it("returns nothing for empty folder list", () => {
    const { container } = render(
      <QuestionFolderGrid folders={[]} prefs={[]} level="grade" onOpen={vi.fn()} />,
    );
    expect(container.querySelector(".grid")).toBeNull();
  });

  it("does not show drag handle when onReorder is not provided", () => {
    render(
      <QuestionFolderGrid folders={[f9]} prefs={[]} level="grade" onOpen={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /Reordenar/ })).toBeNull();
  });

  it("shows drag handle when onReorder is provided", () => {
    render(
      <QuestionFolderGrid
        folders={[f9]}
        prefs={[]}
        level="grade"
        onOpen={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Reordenar/ })).toBeTruthy();
  });
});
