/**
 * Shared state for the universal + directed PDF layout editor.
 *
 * StepPdfPreview previously held two `useHistory<EditableActivity>` instances
 * plus an `activeVersion` flag, and kept them in sync with the wizard store
 * through three imperative `useEffect`s (mount, activity-ref, tab-switch).
 * This hook owns that shape so the component can treat the active version as
 * a plain `{current, setCurrent, undo, redo}` object.
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
  const [active, setActive] = useState<VersionKey>("universal");

  const uHistory = useHistory<EditableActivity>(options.initialUniversal, {
    seed: options.seedHistoryUniversal,
    onChange: options.onHistoryUniversalChange,
  });
  const dHistory = useHistory<EditableActivity>(options.initialDirected, {
    seed: options.seedHistoryDirected,
    onChange: options.onHistoryDirectedChange,
  });

  const history = active === "universal" ? uHistory : dHistory;
  const onParentChange =
    active === "universal"
      ? options.onUniversalChange
      : options.onDirectedChange;

  const setCurrent = useCallback(
    (next: EditableActivity) => {
      history.set(next);
      onParentChange?.(next);
    },
    [history, onParentChange],
  );

  const reset = useCallback(
    (next: EditableActivity) => {
      history.reset(next);
      onParentChange?.(next);
    },
    [history, onParentChange],
  );

  return {
    active,
    setActive,
    current: history.current,
    setCurrent,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    reset,
    universal: uHistory.current,
    directed: dHistory.current,
  };
}
