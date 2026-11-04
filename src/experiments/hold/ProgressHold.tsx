"use client";

import { type CSSProperties, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  buzz,
  EMPTY,
  FADE_MS,
  fadeOut,
  FULL,
  HOLD_MS,
  RELEASE_MS,
  RESULT_MS,
  useHoldHandlers,
  useTimeout,
} from "./Hold";

// The clock behind the variations that take a photo apart (Dissolve, Burn,
// Shred, Fold): how far the hold has got, 0 to 1, advanced every frame. It is
// the one source of truth, for the button's fill (set as --progress) and for
// the animation (handed to `render`, with the element `root` is put on), so
// the two can never disagree; and since each frame is drawn from the progress
// alone, letting go plays it backwards exactly

type ProgressPhase = "idle" | "holding" | "releasing" | "done" | "resetting";

const BY_PROGRESS: CSSProperties = { clipPath: "inset(0 calc(100% - var(--progress, 0) * 100%) 0 0)" };
const FILLS: Record<ProgressPhase, CSSProperties> = {
  idle: BY_PROGRESS,
  holding: BY_PROGRESS,
  releasing: BY_PROGRESS,
  done: { clipPath: FULL },
  resetting: { clipPath: EMPTY, ...fadeOut("clip-path") },
};

// `tail`: how far past 1 the clock runs on once the hold is done, for what is
// still settling (dust, embers, falling shreds), as a share of the hold
export function useProgressHold(render: (progress: number, root: HTMLDivElement) => void, tail = 0) {
  const [phase, setPhase] = useState<ProgressPhase>("idle");
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const onRender = useEffectEvent(render);
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const show = (value: number) => {
      progress.current = value;
      element.style.setProperty("--progress", String(Math.min(value, 1)));
      onRender(value, element);
    };
    // Whole again, unseen, before it fades back in
    if (phase === "resetting") return show(0);
    if (phase === "idle" || (phase === "done" && !tail)) return;

    const from = progress.current;
    let started = 0;
    let frame = requestAnimationFrame(function tick(now) {
      started ||= now;
      const elapsed = now - started;
      if (phase === "holding") {
        // Steady, like the fill in the other variations
        const value = Math.min(1, from + elapsed / HOLD_MS);
        show(value);
        if (value === 1) {
          buzz();
          setPhase("done");
          return;
        }
      } else if (phase === "done") {
        // Gone; what is still in the air carries on at the same pace
        const value = Math.min(1 + tail, from + elapsed / HOLD_MS);
        show(value);
        if (value === 1 + tail) return;
      } else {
        // Letting go plays it back fast, easing in to rest
        const k = Math.min(1, elapsed / RELEASE_MS);
        show(from * (1 - k) ** 3);
        if (k === 1) {
          setPhase("idle");
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, tail]);

  const handlers = useHoldHandlers(
    // Pressing again while it plays back carries on from where it is
    () => setPhase((p) => (p === "idle" || p === "releasing" ? "holding" : p)),
    () => setPhase((p) => (p === "holding" ? "releasing" : p)),
  );
  const done = phase === "done";

  return {
    phase,
    root,
    // Ready to spread on a HoldButton
    button: {
      label: done ? "Deleted" : "Hold to delete",
      icon: done ? ("check" as const) : ("trash" as const),
      pressed: phase === "holding",
      active: phase === "idle" || phase === "holding" || phase === "releasing",
      fill: FILLS[phase],
      handlers,
      onFillEnd: () => {},
    },
  };
}
