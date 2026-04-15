/**
 * Tests for useVersionedLayout — shared history/active-tab state for the
 * universal+directed PDF layout editor.
 *
 * Contract:
 *  - active: "universal" | "directed"
 *  - current: the active version's EditableActivity
 *  - setCurrent: replaces active version's activity and records history
 *  - undo/redo/canUndo/canRedo/reset delegated to active history
 *  - switching active does not drop the other version's history
 *  - each version persists via its own onChange callback
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVersionedLayout } from "@/hooks/useVersionedLayout";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

const makeActivity = (label: string): EditableActivity => ({
  header: {
    schoolName: label,
    subject: "",
    teacherName: "",
    className: "",
    date: "",
    showStudentLine: false,
  },
  globalShowSeparators: true,
  questions: [],
});

describe("useVersionedLayout", () => {
  it("starts on universal version", () => {
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
      }),
    );
    expect(result.current.active).toBe("universal");
    expect(result.current.current.header.schoolName).toBe("u0");
  });

  it("setCurrent updates active version only", () => {
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    expect(result.current.current.header.schoolName).toBe("u1");
    act(() => result.current.setActive("directed"));
    expect(result.current.current.header.schoolName).toBe("d0");
  });

  it("switching active preserves the other version's history", () => {
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    act(() => result.current.setActive("directed"));
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setActive("universal"));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.current.header.schoolName).toBe("u0");
  });

  it("undo/redo route to the active version's history", () => {
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    act(() => result.current.undo());
    expect(result.current.current.header.schoolName).toBe("u0");
    act(() => result.current.redo());
    expect(result.current.current.header.schoolName).toBe("u1");
  });

  it("calls per-version onChange when that version changes", () => {
    const onUniversal = vi.fn();
    const onDirected = vi.fn();
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
        onUniversalChange: onUniversal,
        onDirectedChange: onDirected,
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    expect(onUniversal).toHaveBeenCalledWith(
      expect.objectContaining({ header: expect.objectContaining({ schoolName: "u1" }) }),
    );
    expect(onDirected).not.toHaveBeenCalled();
  });

  it("reset replaces active history with the given activity", () => {
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    act(() => result.current.reset(makeActivity("uR")));
    expect(result.current.current.header.schoolName).toBe("uR");
  });

  it("undo fires onUniversalChange with the restored activity", () => {
    const onUniversal = vi.fn();
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
        onUniversalChange: onUniversal,
      }),
    );
    act(() => result.current.setCurrent(makeActivity("u1")));
    onUniversal.mockClear();
    act(() => result.current.undo());
    expect(onUniversal).toHaveBeenCalledWith(
      expect.objectContaining({ header: expect.objectContaining({ schoolName: "u0" }) }),
    );
  });

  it("redo fires onDirectedChange when active is directed", () => {
    const onDirected = vi.fn();
    const { result } = renderHook(() =>
      useVersionedLayout({
        initialUniversal: makeActivity("u0"),
        initialDirected: makeActivity("d0"),
        onDirectedChange: onDirected,
      }),
    );
    act(() => result.current.setActive("directed"));
    act(() => result.current.setCurrent(makeActivity("d1")));
    act(() => result.current.undo());
    onDirected.mockClear();
    act(() => result.current.redo());
    expect(onDirected).toHaveBeenCalledWith(
      expect.objectContaining({ header: expect.objectContaining({ schoolName: "d1" }) }),
    );
  });

  it("is controlled when active + onActiveChange are supplied", () => {
    const onActiveChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ active }: { active: "universal" | "directed" }) =>
        useVersionedLayout({
          initialUniversal: makeActivity("u0"),
          initialDirected: makeActivity("d0"),
          active,
          onActiveChange,
        }),
      { initialProps: { active: "universal" as const } },
    );
    expect(result.current.active).toBe("universal");
    act(() => result.current.setActive("directed"));
    expect(onActiveChange).toHaveBeenCalledWith("directed");
    // Still universal because parent didn't update the controlled prop
    expect(result.current.active).toBe("universal");
    rerender({ active: "directed" });
    expect(result.current.active).toBe("directed");
  });
});
