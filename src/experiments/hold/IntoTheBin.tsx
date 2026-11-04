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
  useHoldHandlers,
  useTimeout,
} from "./Hold";

// idle → holding → delivering (the bin flies out, takes the file) →
// returning (it flies back into the label) → done → resetting
type Phase = "idle" | "holding" | "delivering" | "returning" | "done" | "resetting";

const FILLS: Record<Phase, CSSProperties> = {
  idle: { clipPath: EMPTY, transition: `clip-path ${RELEASE_MS}ms ease-out` },
  holding: { clipPath: FULL, transition: `clip-path ${HOLD_MS}ms linear` },
  delivering: { clipPath: FULL },
  returning: { clipPath: FULL },
  done: { clipPath: FULL },
  resetting: { clipPath: EMPTY, ...fadeOut("clip-path") },
};

// The bin is drawn at this size and scaled down to sit on the icon's place
const BIN = 56;
// The icon's stroke in the button, and the thinner one at full size, so the
// bin keeps about the same weight of line as it grows
const ICON_STROKE = 1.5;
const BIN_STROKE = 0.6;
// Where the bin waits: centred under the file, this far below it
const BELOW_FILE = 40;

export default function IntoTheBin() {
  const [phase, setPhase] = useState<Phase>("idle");
  const reducedMotion = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const bin = useRef<SVGSVGElement>(null);
  const lid = useRef<SVGGElement>(null);
  const body = useRef<SVGPathElement>(null);
  useTimeout(phase === "done", RESULT_MS, () => setPhase("resetting"));
  useTimeout(phase === "resetting", FADE_MS, () => setPhase("idle"));

  useEffect(() => {
    if (phase !== "delivering" && phase !== "returning") return;
    const parts = [stage.current, file.current, button.current, flyer.current, bin.current, lid.current, body.current];
    if (parts.some((part) => !part)) return;
    const [stageEl, fileEl, buttonEl, flyerEl, binEl, lidEl, bodyEl] = parts as [
      HTMLDivElement,
      HTMLDivElement,
      HTMLButtonElement,
      HTMLDivElement,
      SVGSVGElement,
      SVGGElement,
      SVGPathElement,
    ];
    const animations: Animation[] = [];
    const animate = (
      element: Element,
      keyframes: Keyframe[],
      { delay = 0, duration, easing = "linear", fill = "both" }: KeyframeAnimationOptions & { duration: number },
    ) => {
      animations.push(element.animate(keyframes, { delay: delay, duration: duration, easing, fill }));
    };

    // Positions within the stage, as a transform for the flyer
    const origin = stageEl.getBoundingClientRect();
    const place = (x: number, y: number, scale: number) =>
      `translate(${x - origin.left - BIN / 2}px, ${y - origin.top - BIN / 2}px) scale(${scale})`;
    // Measured now, on whatever label the button shows: the bin lands exactly
    // where the next icon will be
    const icon = buttonEl.querySelector("[data-icon]")!.getBoundingClientRect();
    const home = place(icon.left + icon.width / 2, icon.top + icon.height / 2, icon.width / BIN);
    const card = fileEl.getBoundingClientRect();
    const binX = card.left + card.width / 2;
    const binY = card.bottom + BELOW_FILE;
    const away = place(binX, binY, 1);
    const ink = getComputedStyle(stageEl).color;

    if (reducedMotion) {
      // No flight: the file simply goes
      animate(fileEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    } else if (phase === "delivering") {
      // Out of the button, white on the red, and into the page's ink
      animate(flyerEl, [{ opacity: 1 }, { opacity: 1 }], { duration: 1100 });
      animate(flyerEl, [{ transform: home }, { transform: away }], {
        duration: 420,
        easing: "cubic-bezier(0.2, 0.9, 0.3, 1.12)",
      });
      animate(flyerEl, [{ color: "#fff" }, { color: ink }], { duration: 200 });
      animate(binEl, [{ strokeWidth: ICON_STROKE }, { strokeWidth: BIN_STROKE }], { duration: 420 });
      // An outline on the button; filled once over the page, to hide the file
      animate(bodyEl, [{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 200 });
      // The lid opens as it arrives, waits for the file, then shuts
      animate(
        lidEl,
        [
          { rotate: "0deg", easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          { rotate: "-40deg", offset: 0.27 },
          { rotate: "-40deg", offset: 0.76, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
          { rotate: "0deg" },
        ],
        { delay: 360, duration: 680 },
      );
      // The file falls in, gathering speed, small enough to fit; the bin's
      // body is drawn over it, so it disappears behind the rim, never cut off
      animate(
        fileEl,
        [
          { transform: "none", opacity: 1 },
          { opacity: 1, offset: 0.98 },
          {
            transform: `translate(${binX - (card.left + card.width / 2)}px, ${binY - 2 - (card.top + card.height / 2)}px) scale(0.12)`,
            opacity: 0,
          },
        ],
        { delay: 500, duration: 380, easing: "cubic-bezier(0.55, 0, 0.85, 0.35)" },
      );
      // It takes the weight as the file lands
      animate(binEl, [{ scale: "1 1" }, { scale: "1.08 0.9", offset: 0.35 }, { scale: "1 1" }], {
        delay: 870,
        duration: 230,
        easing: "ease-out",
      });
    } else {
      // Back into the label, white again, its line thickening back to the icon's
      animate(flyerEl, [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 420 });
      animate(flyerEl, [{ transform: away }, { transform: home }], {
        duration: 420,
        easing: "cubic-bezier(0.5, 0, 0.2, 1)",
      });
      animate(flyerEl, [{ color: ink }, { color: "#fff" }], { delay: 220, duration: 200 });
      animate(binEl, [{ strokeWidth: BIN_STROKE }, { strokeWidth: ICON_STROKE }], { duration: 420 });
      animate(bodyEl, [{ fillOpacity: 1 }, { fillOpacity: 0 }], { delay: 120, duration: 200 });
    }

    // Finished, not cancelled (cancelling rejects, and is just the cleanup)
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (phase === "delivering" && !reducedMotion) {
          setPhase("returning");
        } else {
          buzz();
          setPhase("done");
        }
      })
      .catch(() => {});
    return () => animations.forEach((animation) => animation.cancel());
  }, [phase, reducedMotion]);

  const handlers = useHoldHandlers(
    () => setPhase((p) => (p === "idle" ? "holding" : p)),
    () => setPhase((p) => (p === "holding" ? "idle" : p)),
  );
  const deleted = phase === "returning" || phase === "done";

  return (
    <div ref={stage} className="relative flex flex-col items-center text-foreground">
      <div
        ref={file}
        className={`flex h-11 w-52 items-center gap-2.5 rounded-lg bg-background px-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent),0_1px_2px_color-mix(in_srgb,var(--foreground)_6%,transparent)] ${
          deleted ? "opacity-0" : phase === "resetting" ? "motion-safe:animate-label" : ""
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        >
          <path d="M4 1.75h5.25L12 4.5v9.75H4zM9.25 1.75V4.5H12" />
        </svg>
        <span className="min-w-0 truncate text-sm">Q3 report.pdf</span>
        <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-faint tabular-nums">2.4 MB</span>
      </div>

      <div className="mt-24">
        <HoldButton
          ref={button}
          label={deleted ? "Deleted" : "Hold to delete"}
          // While it flies back the icon's place is kept empty; the check
          // draws itself only once the bin has landed in it
          icon={phase === "done" ? "check" : "trash"}
          iconAway={phase === "delivering" || phase === "returning"}
          pressed={phase === "holding"}
          active={phase === "idle" || phase === "holding"}
          fill={FILLS[phase]}
          handlers={handlers}
          onFillEnd={(property) => {
            if (property !== "clip-path" || phase !== "holding") return;
            setPhase("delivering");
          }}
        />
      </div>
      <p className="mt-4 text-center text-sm text-faint">Hold, and watch where the bin goes</p>

      {/* The bin in flight: the button's own trash icon, drawn large. Its body
          is filled with the page colour and drawn over the file */}
      <div
        ref={flyer}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 opacity-0"
        style={{ width: BIN, height: BIN }}
      >
        <svg
          ref={bin}
          viewBox="0 0 16 16"
          className="size-full origin-[50%_90%] overflow-visible"
          fill="none"
          stroke="currentColor"
          strokeWidth={ICON_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            ref={body}
            d="M4.5 4.5l.6 8.1a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.1"
            style={{ fill: "var(--background)" }}
          />
          {/* Hinged at its left end */}
          <g ref={lid} className="origin-[3px_4.5px] [transform-box:view-box]">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
