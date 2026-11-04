"use client";

import { type CSSProperties, useState } from "react";
import {
  buzz,
  FADE_MS,
  fadeOut,
  HOLD_MS,
  HoldButton,
  type Press,
  RELEASE_MS,
  RESULT_MS,
  WithHint,
  useHoldHandlers,
  useTimeout,
} from "./Hold";

type Phase = "idle" | "holding" | "done" | "resetting";

export default function FromYourFinger() {
  const [phase, setPhase] = useState<Phase>("idle");
  // Where the circle grows from, and how big it must get to cover the button
  const [origin, setOrigin] = useState({ x: 0, y: 0, reach: 0 });
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  const press = ({ x, y, width, height }: Press) => {
    if (phase !== "idle") return;
    setOrigin({ x, y, reach: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) });
    setPhase("holding");
  };
  const handlers = useHoldHandlers(press, () => setPhase((p) => (p === "holding" ? "idle" : p)));
  const done = phase === "done";

  // Only the radius animates (a registered property, see globals.css): the
  // centre jumps to each new press instead of sliding the circle across
  const radius: Record<Phase, CSSProperties> = {
    idle: { "--hold-radius": "0px", transition: `--hold-radius ${RELEASE_MS}ms ease-out` } as CSSProperties,
    holding: {
      "--hold-radius": `${origin.reach}px`,
      transition: `--hold-radius ${HOLD_MS}ms linear`,
    } as CSSProperties,
    done: { "--hold-radius": `${origin.reach}px` } as CSSProperties,
    resetting: { "--hold-radius": "0px", ...fadeOut("--hold-radius") } as CSSProperties,
  };

  return (
    <WithHint hint="Press anywhere on the button and hold">
      <HoldButton
        label={done ? "Deleted" : "Hold to delete"}
        icon={done ? "check" : "trash"}
        pressed={phase === "holding"}
        active={phase === "idle" || phase === "holding"}
        fill={{ clipPath: `circle(var(--hold-radius) at ${origin.x}px ${origin.y}px)`, ...radius[phase] }}
        handlers={handlers}
        onFillEnd={(property) => {
          if (property !== "--hold-radius" || phase !== "holding") return;
          buzz();
          setPhase("done");
        }}
      />
    </WithHint>
  );
}
