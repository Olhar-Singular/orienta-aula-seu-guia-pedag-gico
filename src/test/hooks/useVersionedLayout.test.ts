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
});
