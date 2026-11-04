"use client";

import { type CSSProperties, useState } from "react";
import {
  buzz,
  EMPTY,
  fadeOut,
  FULL,
  HOLD_MS,
  HoldButton,
  RELEASE_MS,
  RESULT_MS,
  WithHint,
  useHoldHandlers,
  useTimeout,
} from "./Hold";

// How long a deletion can still be taken back
const UNDO_MS = 4000;

type Phase = "idle" | "holding" | "undoable" | "restored" | "gone";

const FILLS: Record<Phase, CSSProperties> = {
  idle: { clipPath: EMPTY, transition: `clip-path ${RELEASE_MS}ms ease-out` },
  holding: { clipPath: FULL, transition: `clip-path ${HOLD_MS}ms linear` },
  // Draining back to empty is the countdown, so it reads as time running out
  undoable: { clipPath: EMPTY, transition: `clip-path ${UNDO_MS}ms linear` },
  // Caught in time: what is left of the red fades away
  restored: { clipPath: EMPTY, ...fadeOut("clip-path") },
  gone: { clipPath: EMPTY },
};

const LABELS: Record<Phase, { label: string; icon: "trash" | "check" | "undo" }> = {
  idle: { label: "Hold to delete", icon: "trash" },
  holding: { label: "Hold to delete", icon: "trash" },
  undoable: { label: "Tap to undo", icon: "undo" },
  restored: { label: "Restored", icon: "check" },
  gone: { label: "Deleted", icon: "check" },
};

export default function UndoWindow() {
  const [phase, setPhase] = useState<Phase>("idle");
  useTimeout(phase === "restored" || phase === "gone", RESULT_MS, () => setPhase("idle"));

  const press = () => {
    if (phase === "undoable") buzz();
    setPhase((p) => (p === "idle" ? "holding" : p === "undoable" ? "restored" : p));
  };
  const handlers = useHoldHandlers(press, () => setPhase((p) => (p === "holding" ? "idle" : p)));

  return (
    <WithHint hint="Hold to delete, then tap before the red runs out">
      <HoldButton
        {...LABELS[phase]}
        pressed={phase === "holding"}
        active={phase === "idle" || phase === "holding" || phase === "undoable"}
        fill={FILLS[phase]}
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "clip-path") return;
          if (phase === "holding") {
            buzz();
            setPhase("undoable");
          } else if (phase === "undoable") {
            setPhase("gone");
          }
        }}
      />
    </WithHint>
  );
}
