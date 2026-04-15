/**
 * Tests for useActivityContent — the single source of truth for editor DSL + registry.
 *
 * Contract:
 *  - state is always canonical (no raw http/data URLs inside [img:...] tokens)
 *  - setDsl accepts raw text and canonicalizes synchronously
 *  - dslExpanded is derived (placeholders replaced with real URLs)
 *  - registry grows monotonically across setDsl calls
 *  - undo/redo restore the full {dsl, registry} tuple
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActivityContent } from "@/hooks/useActivityContent";

describe("useActivityContent", () => {
  it("initial state is canonical when seeded with raw DSL", () => {
    const { result } = renderHook(() =>
      useActivityContent({
        initialDsl: "1) q\n[img:https://a.test/1.png]",
        initialRegistry: {},
      }),
    );
    expect(result.current.dsl).not.toMatch(/\[img:https?:\/\//);
    expect(Object.values(result.current.registry)).toContain("https://a.test/1.png");
  });

  it("setDsl canonicalizes synchronously", () => {
    const { result } = renderHook(() =>
      useActivityContent({ initialDsl: "", initialRegistry: {} }),
    );
    act(() => {
      result.current.setDsl("1) q\n[img:https://a.test/1.png]");
    });
    expect(result.current.dsl).not.toMatch(/\[img:https?:\/\//);
    expect(Object.values(result.current.registry)).toContain("https://a.test/1.png");
  });

  it("dslExpanded replaces placeholders with real URLs", () => {
    const { result } = renderHook(() =>
      useActivityContent({
        initialDsl: "1) q\n[img:https://a.test/1.png]",
        initialRegistry: {},
      }),
    );
    expect(result.current.dslExpanded).toContain("[img:https://a.test/1.png]");
  });

  it("registry grows monotonically across setDsl calls", () => {
    const { result } = renderHook(() =>
      useActivityContent({
        initialDsl: "[img:https://a.test/1.png]",
        initialRegistry: {},
      }),
    );
    const firstKeys = Object.keys(result.current.registry);
    act(() => {
      result.current.setDsl(result.current.dsl + "\n[img:https://a.test/2.png]");
    });
    const secondKeys = Object.keys(result.current.registry);
    for (const k of firstKeys) expect(secondKeys).toContain(k);
    expect(Object.values(result.current.registry)).toContain("https://a.test/1.png");
    expect(Object.values(result.current.registry)).toContain("https://a.test/2.png");
  });

  it("undo restores previous dsl", () => {
    const { result } = renderHook(() =>
      useActivityContent({ initialDsl: "original", initialRegistry: {} }),
    );
    act(() => result.current.setDsl("changed"));
    expect(result.current.dsl).toBe("changed");
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.dsl).toBe("original");
  });

  it("redo restores the undone change", () => {
    const { result } = renderHook(() =>
      useActivityContent({ initialDsl: "original", initialRegistry: {} }),
    );
    act(() => result.current.setDsl("changed"));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(result.current.dsl).toBe("changed");
  });

  it("setDsl with already-canonical text is a no-op on registry", () => {
    const { result } = renderHook(() =>
      useActivityContent({
        initialDsl: "[img:https://a.test/1.png]",
        initialRegistry: {},
      }),
    );
    const reg1 = result.current.registry;
    const canonical = result.current.dsl;
    act(() => result.current.setDsl(canonical));
    expect(result.current.dsl).toBe(canonical);
    expect(result.current.registry).toEqual(reg1);
  });

  it("preserves seeded registry entries", () => {
    const { result } = renderHook(() =>
      useActivityContent({
        initialDsl: "1) q",
        initialRegistry: { "imagem-1": "https://seed.test/x.png" },
      }),
    );
    expect(result.current.registry["imagem-1"]).toBe("https://seed.test/x.png");
  });
});
