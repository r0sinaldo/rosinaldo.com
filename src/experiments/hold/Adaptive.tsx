"use client";

import { useState } from "react";
import {
  buzz,
  EMPTY,
  FADE_MS,
  fadeOut,
  FULL,
  HoldButton,
  RELEASE_MS,
  RESULT_MS,
  WithHint,
  useHoldHandlers,
  useTimeout,
} from "./Hold";

const SLOWEST_MS = 2000;
const FASTEST_MS = 500;
// Finishing a hold shows you mean it, so the next is quicker; letting go
// halfway is hesitation, so the next is slower again
const AFTER_FINISH = 0.65;
const AFTER_HESITATION = 1.3;
// A release sooner than this was a tap, not hesitation
const TAP_MS = 250;

type Phase = "idle" | "holding" | "done" | "resetting";

export default function Adaptive() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [holdMs, setHoldMs] = useState(SLOWEST_MS);
  const [pressedAt, setPressedAt] = useState(0);
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  const handlers = useHoldHandlers(
    ({ time }) => {
      if (phase !== "idle") return;
      setPressedAt(time);
      setPhase("holding");
    },
    (time) => {
      if (phase !== "holding") return;
      if (time - pressedAt > TAP_MS) {
        setHoldMs((ms) => Math.min(SLOWEST_MS, Math.round(ms * AFTER_HESITATION)));
      }
      setPhase("idle");
    },
  );
  const done = phase === "done";

  return (
    <WithHint
      hint={
        <>
          Hold for <span className="text-muted tabular-nums">{(holdMs / 1000).toFixed(1)}s</span>, quicker each time you
          finish
        </>
      }
    >
      <HoldButton
        label={done ? "Deleted" : "Hold to delete"}
        icon={done ? "check" : "trash"}
        pressed={phase === "holding"}
        active={phase === "idle" || phase === "holding"}
        fill={
          phase === "idle"
            ? { clipPath: EMPTY, transition: `clip-path ${RELEASE_MS}ms ease-out` }
            : phase === "holding"
              ? { clipPath: FULL, transition: `clip-path ${holdMs}ms linear` }
              : phase === "done"
                ? { clipPath: FULL }
                : { clipPath: EMPTY, ...fadeOut("clip-path") }
        }
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "clip-path" || phase !== "holding") return;
          buzz();
          setHoldMs((ms) => Math.max(FASTEST_MS, Math.round(ms * AFTER_FINISH)));
          setPhase("done");
        }}
      />
    </WithHint>
  );
}
