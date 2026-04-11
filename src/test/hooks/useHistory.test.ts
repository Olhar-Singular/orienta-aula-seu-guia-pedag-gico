import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "@/hooks/useHistory";

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
});
