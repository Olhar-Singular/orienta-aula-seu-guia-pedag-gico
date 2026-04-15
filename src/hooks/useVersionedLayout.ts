/**
 * Shared state for the universal + directed PDF layout editor.
 *
 * StepPdfPreview previously held two `useHistory<EditableActivity>` instances
 * plus an `activeVersion` flag, and kept them in sync with the wizard store
 * through three imperative `useEffect`s (mount, activity-ref, tab-switch).
 * This hook owns that shape so the component can treat the active version as
 * a plain `{current, setCurrent, undo, redo}` object.
 *
 * Change propagation (onUniversalChange/onDirectedChange) flows through
 * useHistory's own onChange, so every set/undo/redo/reset fires once with
 * the new present — no need for a consumer-side ref watcher.
 *
 * `active` is uncontrolled by default; pass both `active` and `onActiveChange`
 * to lift it (e.g. to URL params or a parent store).
 */

import { useCallback, useState } from "react";
import { useHistory, type HistoryState } from "@/hooks/useHistory";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

export type VersionKey = "universal" | "directed";

export type UseVersionedLayoutOptions = {
  initialUniversal: EditableActivity;
  initialDirected: EditableActivity;
  seedHistoryUniversal?: HistoryState<EditableActivity>;
  seedHistoryDirected?: HistoryState<EditableActivity>;
  onUniversalChange?: (activity: EditableActivity) => void;
  onDirectedChange?: (activity: EditableActivity) => void;
  onHistoryUniversalChange?: (state: HistoryState<EditableActivity>) => void;
  onHistoryDirectedChange?: (state: HistoryState<EditableActivity>) => void;
  active?: VersionKey;
  onActiveChange?: (next: VersionKey) => void;
};

export type UseVersionedLayoutReturn = {
  active: VersionKey;
  setActive: (next: VersionKey) => void;
  current: EditableActivity;
  setCurrent: (next: EditableActivity) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (next: EditableActivity) => void;
  universal: EditableActivity;
  directed: EditableActivity;
};

export function useVersionedLayout(
  options: UseVersionedLayoutOptions,
): UseVersionedLayoutReturn {
  const [internalActive, setInternalActive] = useState<VersionKey>("universal");
  const isControlled = options.active !== undefined;
  const active = isControlled ? options.active! : internalActive;
  const setActive = useCallback(
    (next: VersionKey) => {
      if (!isControlled) setInternalActive(next);
      options.onActiveChange?.(next);
    },
    [isControlled, options],
  );

  const uHistory = useHistory<EditableActivity>(options.initialUniversal, {
    seed: options.seedHistoryUniversal,
    onChange: (state) => {
      options.onHistoryUniversalChange?.(state);
      options.onUniversalChange?.(state.present);
    },
  });
  const dHistory = useHistory<EditableActivity>(options.initialDirected, {
    seed: options.seedHistoryDirected,
    onChange: (state) => {
      options.onHistoryDirectedChange?.(state);
      options.onDirectedChange?.(state.present);
    },
  });

  const history = active === "universal" ? uHistory : dHistory;

  return {
    active,
    setActive,
    current: history.current,
    setCurrent: history.set,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    reset: history.reset,
    universal: uHistory.current,
    directed: dHistory.current,
  };
}
