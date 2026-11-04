"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useContext,
  useEffect,
  useEffectEvent,
} from "react";
import { AutoplayContext } from "../Autoplay";

// What every hold-to-confirm variation shares: the button itself, the way a
// press starts and ends (pointer or keyboard), and the timings

export const HOLD_MS = 1600;
export const RELEASE_MS = 200;
// How long a result stays on the button, then how long it takes to fade away
export const RESULT_MS = 1600;
export const FADE_MS = 300;

// The button's size, in CSS pixels
const BUTTON = { width: 176, height: 40 };
// Held by itself (see Autoplay): a beat before pressing, then held for longer
// than any variation's hold, so each one completes
const AUTOPLAY = { press: 700, hold: 2200 };

export const EMPTY = "inset(0 100% 0 0)";
export const FULL = "inset(0 0 0 0)";

// Fades the fill out, and only once it is invisible puts `properties` back to
// empty: a finished hold resets without the wipe running backwards, which
// would read as the action being undone
export const fadeOut = (...properties: string[]): CSSProperties => ({
  opacity: 0,
  transition: [`opacity ${FADE_MS}ms ease-out`, ...properties.map((p) => `${p} 0s ${FADE_MS}ms`)].join(", "),
});

// A press, as the variations need it: where it landed (the middle, from the
// keyboard) in the button's own unscaled pixels, the button's size, and when
export type Press = { x: number; y: number; width: number; height: number; time: number };

const isHoldKey = (key: string) => key === " " || key === "Enter";

// The button's handlers for a press and its release, from the pointer or the
// keyboard; and, when the demo is playing by itself, a press made for it
export function useHoldHandlers(press: (press: Press) => void, release: (time: number) => void) {
  const autoplay = useContext(AutoplayContext);
  const pressByItself = useEffectEvent(() =>
    press({ x: BUTTON.width / 2, y: BUTTON.height / 2, ...BUTTON, time: performance.now() }),
  );
  const releaseByItself = useEffectEvent(() => release(performance.now()));
  useEffect(() => {
    if (!autoplay) return;
    const timers = [
      setTimeout(pressByItself, AUTOPLAY.press),
      setTimeout(releaseByItself, AUTOPLAY.press + AUTOPLAY.hold),
    ];
    return () => timers.forEach(clearTimeout);
  }, [autoplay]);

  const onRelease = (event: SyntheticEvent) => release(event.timeStamp);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const { offsetWidth: width, offsetHeight: height } = event.currentTarget;
      const rect = event.currentTarget.getBoundingClientRect();
      // The rect is the pressed (scaled-down) box; scale back to layout pixels
      const ratio = width / rect.width;
      press({
        x: (event.clientX - rect.left) * ratio,
        y: (event.clientY - rect.top) * ratio,
        width,
        height,
        time: event.timeStamp,
      });
    },
    onPointerUp: onRelease,
    onPointerLeave: onRelease,
    onPointerCancel: onRelease,
    onBlur: onRelease,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!isHoldKey(event.key)) return;
      event.preventDefault();
      if (event.repeat) return;
      const { offsetWidth: width, offsetHeight: height } = event.currentTarget;
      press({ x: width / 2, y: height / 2, width, height, time: event.timeStamp });
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (isHoldKey(event.key)) onRelease(event);
    },
    // A long press on phones would otherwise open the system menu
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
  };
}

// A short tap of the phone's motor where there is one (Android; iOS has no API)
export const buzz = (ms = 20) => navigator.vibrate?.(ms);

// Runs `callback` once `active` has stayed true for `delay` ms
export function useTimeout(active: boolean, delay: number, callback: () => void) {
  const onTimeout = useEffectEvent(callback);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onTimeout, delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
}

type Icon = "trash" | "check" | "undo";

type HoldButtonProps = {
  label: string;
  icon: Icon;
  // Squeezed in while held
  pressed?: boolean;
  // False while the button shows a result: no hover, no pointer cursor
  active?: boolean;
  // The fill's own style for the current phase (clip, colour, transition)
  fill: CSSProperties;
  // A transition on the fill finished; variations use it as their timer, so
  // what you see and what happens can never drift apart
  onFillEnd: (property: string) => void;
  handlers: ReturnType<typeof useHoldHandlers>;
  // The icon has left the button (see IntoTheBin): its place stays, empty
  iconAway?: boolean;
  ref?: Ref<HTMLButtonElement>;
  style?: CSSProperties;
};

export function HoldButton({
  label,
  icon,
  pressed = false,
  active = true,
  fill,
  onFillEnd,
  handlers,
  iconAway = false,
  ref,
  style,
}: HoldButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      {...handlers}
      style={{
        // Its own compositor layer, kept for good: the label is drawn once and
        // the squeeze (and the tremble in BuildingTension) scales and moves that
        // picture. Without it the text is redrawn at every in-between size, its
        // letters snapping to the pixel grid a little differently each frame,
        // which reads as a shimmer, then a jump when it is redrawn at rest
        willChange: "scale, translate",
        ...BUTTON,
        // In quickly and plainly; out with a little spring, like letting go of something elastic
        transition: pressed
          ? `scale 120ms ease-out, background-color 150ms ease-out`
          : `scale 450ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease-out`,
        ...style,
      }}
      className={`relative touch-none overflow-hidden rounded-[6px] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] font-medium select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faint ${
        active ? "cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_11%,transparent)]" : "cursor-default"
      } ${pressed ? "motion-safe:scale-97" : ""}`}
    >
      {/* Stays mounted, so screen readers hear each new label */}
      <span aria-live="polite" className="block h-full">
        <Label text={label} icon={icon} away={iconAway} />
      </span>
      {/* The same label again in the fill's colours, clipped: the text seems to
          change colour exactly where the fill's edge passes over it */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[#e5484d] text-white"
        style={fill}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) onFillEnd(event.propertyName);
        }}
      >
        <Label text={label} icon={icon} away={iconAway} />
      </span>
    </button>
  );
}

// Keyed by its text, so each new label mounts afresh and plays its entrance;
// both copies (plain and filled) do it in step
function Label({ text, icon, away }: { text: string; icon: Icon; away: boolean }) {
  return (
    <span
      key={text}
      className="flex h-full items-center justify-center gap-1.5 whitespace-nowrap motion-safe:animate-label"
    >
      <svg
        aria-hidden
        data-icon
        viewBox="0 0 16 16"
        className={`size-3.5 shrink-0 ${away ? "opacity-0" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon === "trash" && (
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.1a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.1" />
        )}
        {/* Drawn on, start to end, as the result arrives */}
        {icon === "check" && (
          <path
            d="M3.5 8.5l3 3 6-7"
            strokeWidth="1.75"
            pathLength={1}
            className="[stroke-dasharray:1] motion-safe:animate-draw"
          />
        )}
        {icon === "undo" && <path d="M5.5 6.5H10a2.75 2.75 0 0 1 0 5.5H7.5M5.5 6.5 7.75 4.25M5.5 6.5l2.25 2.25" />}
      </svg>
      {text}
    </span>
  );
}

export function WithHint({ hint, children }: { hint: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {children}
      <p className="text-center text-sm text-faint">{hint}</p>
    </div>
  );
}
