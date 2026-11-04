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

type Phase = "idle" | "holding" | "done" | "resetting";

const FILLS: Record<Phase, CSSProperties> = {
  idle: { clipPath: EMPTY, transition: `clip-path ${RELEASE_MS}ms ease-out` },
  holding: { clipPath: FULL, transition: `clip-path ${HOLD_MS}ms linear` },
  done: { clipPath: FULL },
  resetting: { clipPath: EMPTY, ...fadeOut("clip-path") },
};

export default function Classic() {
  const [phase, setPhase] = useState<Phase>("idle");
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  const handlers = useHoldHandlers(
    () => setPhase((p) => (p === "idle" ? "holding" : p)),
    () => setPhase((p) => (p === "holding" ? "idle" : p)),
  );
  const done = phase === "done";

  return (
    <WithHint hint="Press and hold">
      <HoldButton
        label={done ? "Deleted" : "Hold to delete"}
        icon={done ? "check" : "trash"}
        pressed={phase === "holding"}
        active={phase === "idle" || phase === "holding"}
        fill={FILLS[phase]}
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "clip-path" || phase !== "holding") return;
          buzz();
          setPhase("done");
        }}
      />
    </WithHint>
  );
}
