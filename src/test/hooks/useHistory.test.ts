import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory, type HistoryState } from "@/hooks/useHistory";

describe("useHistory", () => {
  it("initializes with the given value", () => {
    const { result } = renderHook(() => useHistory("initial"));

    expect(result.current.current).toBe("initial");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("updates current value with set()", () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => result.current.set(1));

    expect(result.current.current).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("undoes to previous value", () => {
    const { result } = renderHook(() => useHistory("a"));

    act(() => result.current.set("b"));
    act(() => result.current.set("c"));
    act(() => result.current.undo());

    expect(result.current.current).toBe("b");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it("redoes to next value", () => {
    const { result } = renderHook(() => useHistory(1));

    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.current).toBe(3);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("clears future on new set() after undo", () => {
    const { result } = renderHook(() => useHistory(1));

    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.undo()); // back to 2
    act(() => result.current.set(4)); // new branch

    expect(result.current.current).toBe(4);
    expect(result.current.canRedo).toBe(false);
  });

  it("does nothing on undo when no past", () => {
    const { result } = renderHook(() => useHistory("only"));

    act(() => result.current.undo());

    expect(result.current.current).toBe("only");
  });

  it("does nothing on redo when no future", () => {
    const { result } = renderHook(() => useHistory("only"));

    act(() => result.current.redo());

    expect(result.current.current).toBe("only");
  });

  it("resets to a new value clearing history", () => {
    const { result } = renderHook(() => useHistory(1));

    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.reset(10));

    expect(result.current.current).toBe(10);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("limits past stack to 50 entries", () => {
    const { result } = renderHook(() => useHistory(0));

    for (let i = 1; i <= 55; i++) {
      act(() => result.current.set(i));
    }

    expect(result.current.current).toBe(55);

    // Undo 50 times should work
    for (let i = 0; i < 50; i++) {
      act(() => result.current.undo());
    }

    expect(result.current.canUndo).toBe(false);
    // Should be at value 5 (55 - 50 = 5, but first entry 0 was pushed out)
    expect(result.current.current).toBe(5);
  });

  it("works with complex objects", () => {
    const { result } = renderHook(() =>
      useHistory({ name: "a", items: [1, 2] }),
    );

    act(() => result.current.set({ name: "b", items: [3, 4] }));
    act(() => result.current.undo());

    expect(result.current.current).toEqual({ name: "a", items: [1, 2] });
  });

  describe("seed + onChange (Bug 3 — history persistence across remount)", () => {
    it("initializes from a seed instead of the initial value", () => {
      const seed: HistoryState<string> = {
        past: ["one", "two"],
        present: "three",
        future: ["four"],
      };
      const { result } = renderHook(() =>
        useHistory("ignored", { seed }),
      );

      expect(result.current.current).toBe("three");
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it("preserves the past stack from seed — undo walks it back", () => {
      const seed: HistoryState<number> = {
        past: [1, 2],
        present: 3,
        future: [],
      };
      const { result } = renderHook(() =>
        useHistory(0, { seed }),
      );

      act(() => result.current.undo());
      expect(result.current.current).toBe(2);
      act(() => result.current.undo());
      expect(result.current.current).toBe(1);
      expect(result.current.canUndo).toBe(false);
    });

    it("preserves the future stack from seed — redo walks it forward", () => {
      const seed: HistoryState<number> = {
        past: [],
        present: 1,
        future: [2, 3],
      };
      const { result } = renderHook(() =>
        useHistory(0, { seed }),
      );

      act(() => result.current.redo());
      expect(result.current.current).toBe(2);
      act(() => result.current.redo());
      expect(result.current.current).toBe(3);
      expect(result.current.canRedo).toBe(false);
    });

    it("calls onChange with full history state after set", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useHistory("a", { onChange }),
      );

      act(() => result.current.set("b"));

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toEqual({
        past: ["a"],
        present: "b",
        future: [],
      });
    });

    it("calls onChange with full history state after undo/redo", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useHistory(1, { onChange }),
      );

      act(() => result.current.set(2));
      act(() => result.current.set(3));
      act(() => result.current.undo());

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.present).toBe(2);
      expect(lastCall.past).toEqual([1]);
      expect(lastCall.future).toEqual([3]);
    });

    it("onChange is not invoked for the initial seed (avoids parent loop)", () => {
      const onChange = vi.fn();
      renderHook(() => useHistory("a", { onChange }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
