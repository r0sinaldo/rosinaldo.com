"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
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

// Starts slow and rushes at the end, like pressure building
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";
// The red the fill deepens to by the end of the hold
const DEEP_RED = "#b4232a";

const FILLS: Record<Phase, CSSProperties> = {
  idle: {
    clipPath: EMPTY,
    transition: `clip-path ${RELEASE_MS}ms ease-out, background-color ${RELEASE_MS}ms ease-out`,
  },
  holding: {
    clipPath: FULL,
    backgroundColor: DEEP_RED,
    transition: `clip-path ${HOLD_MS}ms linear, background-color ${HOLD_MS}ms ${EASE_IN}`,
  },
  done: { clipPath: FULL, backgroundColor: DEEP_RED },
  resetting: { clipPath: EMPTY, ...fadeOut("clip-path", "background-color") },
};

export default function BuildingTension() {
  const [phase, setPhase] = useState<Phase>("idle");
  const button = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  // While held: a tremble that grows with the cube of progress (barely there,
  // then sudden), and haptic pulses that come faster and stronger
  useEffect(() => {
    const element = button.current;
    if (phase !== "holding" || !element) return;
    const start = performance.now();
    let nextPulse = start;
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - start) / HOLD_MS, 1);
      if (!reducedMotion) {
        const amplitude = progress ** 3 * 1.6;
        element.style.translate = `${Math.sin(now / 14) * amplitude}px ${Math.cos(now / 19) * amplitude * 0.5}px`;
      }
      if (now >= nextPulse) {
        buzz(6 + 14 * progress);
        nextPulse = now + (260 - 210 * progress);
      }
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      element.style.translate = "";
    };
  }, [phase, reducedMotion]);

  const handlers = useHoldHandlers(
    () => setPhase((p) => (p === "idle" ? "holding" : p)),
    () => setPhase((p) => (p === "holding" ? "idle" : p)),
  );
  const holding = phase === "holding";
  const done = phase === "done";

  return (
    <WithHint hint="Press and hold, and feel it build">
      <HoldButton
        ref={button}
        label={done ? "Deleted" : "Hold to delete"}
        icon={done ? "check" : "trash"}
        active={phase === "idle" || holding}
        // Its own squeeze instead of the usual one: slow and deepening over
        // the whole hold, then a spring back on release
        style={{
          scale: holding && !reducedMotion ? 0.92 : 1,
          transition: holding
            ? `scale ${HOLD_MS}ms ${EASE_IN}, background-color 150ms ease-out`
            : `scale 450ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease-out`,
        }}
        fill={FILLS[phase]}
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "clip-path" || phase !== "holding") return;
          buzz(40);
          setPhase("done");
        }}
      />
    </WithHint>
  );
}
