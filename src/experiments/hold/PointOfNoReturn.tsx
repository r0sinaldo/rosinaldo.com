"use client";

import { type CSSProperties, useState } from "react";
import {
  buzz,
  EMPTY,
  FADE_MS,
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

// How far the fill gets before the button commits
const COMMIT_AT = 0.8;

type Phase = "idle" | "holding" | "committed" | "done" | "resetting";

const FILLS: Record<Phase, CSSProperties> = {
  idle: { clipPath: EMPTY, transition: `clip-path ${RELEASE_MS}ms ease-out` },
  holding: {
    clipPath: `inset(0 ${(1 - COMMIT_AT) * 100}% 0 0)`,
    transition: `clip-path ${HOLD_MS * COMMIT_AT}ms linear`,
  },
  // The snap to the end is what tells you it has committed
  committed: { clipPath: FULL, transition: `clip-path 350ms cubic-bezier(0.23, 1, 0.32, 1)` },
  done: { clipPath: FULL },
  resetting: { clipPath: EMPTY, ...fadeOut("clip-path") },
};

export default function PointOfNoReturn() {
  const [phase, setPhase] = useState<Phase>("idle");
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  const handlers = useHoldHandlers(
    () => setPhase((p) => (p === "idle" ? "holding" : p)),
    // Before the commit, letting go cancels; after it, letting go is the confirmation
    () => {
      if (phase === "committed") buzz();
      setPhase((p) => (p === "holding" ? "idle" : p === "committed" ? "done" : p));
    },
  );
  const done = phase === "done";

  return (
    <WithHint hint="Hold past the point of no return, then let go">
      <HoldButton
        label={done ? "Deleted" : phase === "committed" ? "Release to delete" : "Hold to delete"}
        icon={done ? "check" : "trash"}
        pressed={phase === "holding" || phase === "committed"}
        active={phase === "idle" || phase === "holding" || phase === "committed"}
        fill={FILLS[phase]}
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "clip-path" || phase !== "holding") return;
          buzz(10);
          setPhase("committed");
        }}
      />
    </WithHint>
  );
}
