"use client";

import { type CSSProperties, useEffect } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HoldButton } from "./Hold";
import { PHOTO, PHOTO_LABEL, photoCanvas, RADIUS } from "./Photo";
import { useProgressHold } from "./ProgressHold";

const HALF = PHOTO / 2;

// The hold, in three moves: the top half folds down over the bottom, the
// right half over the left, and the small packet drops away
const FIRST = 0.42;
const SECOND = 0.36;
const AWAY = 1 - FIRST - SECOND;

const clamp = (t: number) => Math.min(1, Math.max(0, t));
// A fold starts gently, swings through the middle and settles flat
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// Leaving gathers speed
const easeIn = (t: number) => t ** 3;

// The look of paper's back, for whatever a fold turns over
const PAPER = "linear-gradient(135deg, #f8f5ef, #ebe6dc)";

// Shadow from a fold: deepest when it is half way, edge-on. The fold defaults
// to 0: before the first frame sets it, an unset variable would make the
// opacity invalid, and the shadow solid black
const shade = (fold: string, strength: number) => `sin(var(${fold}, 0) * 180deg) * ${strength}`;
const shadow = (...shades: string[]) => (shades.length ? `calc(${shades.join(" + ")})` : 0);

// A face turning with the first fold darkens as it turns from the light, and
// the faces it comes down over darken less, in its shadow
const TURNING = shade("--f1", 0.28);
const UNDER = shade("--f1", 0.14);

type Corner = "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
const round = (corner?: Corner): CSSProperties => (corner ? { [`border${corner}Radius`]: RADIUS } : {});

type FaceProps = {
  x: number;
  y: number;
  // The photo's own rounded corner, if this quarter has it
  rounded: Corner;
  // The corner the back shows once folded over: where the paper's outer
  // corner lands
  flippedRounded?: Corner;
  back: string;
  // What darkens the front and the back, as it turns or is folded over
  front: string[];
  behind: string[];
};

// One quarter of the photo: its picture on the front, paper on the back
function Face({ x, y, rounded, flippedRounded, back, front, behind }: FaceProps) {
  const face = "absolute inset-0 overflow-hidden [backface-visibility:hidden]";
  return (
    <>
      <div
        className={face}
        style={{
          ...round(rounded),
          backgroundImage: "var(--photo)",
          backgroundSize: `${PHOTO}px ${PHOTO}px`,
          backgroundPosition: `${-x}px ${-y}px`,
        }}
      >
        <div className="absolute inset-0 bg-black" style={{ opacity: shadow(...front) }} />
      </div>
      <div className={face} style={{ ...round(flippedRounded), background: PAPER, transform: back }}>
        <div className="absolute inset-0 bg-black" style={{ opacity: shadow(...behind) }} />
      </div>
    </>
  );
}

const QUARTER = "absolute [transform-style:preserve-3d]";
const SIZE: CSSProperties = { width: HALF, height: HALF };

export default function Fold() {
  const reducedMotion = useReducedMotion();
  const { phase, root, button } = useProgressHold((progress, element) => {
    const set = (name: string, value: number) => element.style.setProperty(name, value.toFixed(4));
    if (reducedMotion) {
      set("--f1", 0);
      set("--f2", 0);
      set("--away", 0);
      set("--gone", progress);
      return;
    }
    set("--f1", easeInOut(clamp(progress / FIRST)));
    set("--f2", easeInOut(clamp((progress - FIRST) / SECOND)));
    const away = easeIn(clamp((progress - FIRST - SECOND) / AWAY));
    set("--away", away);
    set("--gone", away);
  });

  // The picture every face shows a quarter of, painted once at the screen's
  // pixel density
  useEffect(() => {
    root.current?.style.setProperty("--photo", `url(${photoCanvas().photo.toDataURL()})`);
  }, [root]);

  return (
    <div ref={root} className="flex flex-col items-center">
      <div
        role="img"
        aria-label={PHOTO_LABEL}
        style={{ width: PHOTO, height: PHOTO }}
        className={`relative [perspective:600px] ${phase === "resetting" ? "motion-safe:animate-label" : ""}`}
      >
        {/* The whole sheet; once folded it is a quarter-size packet in the
            bottom-left, so it drops and shrinks around that */}
        <div
          className="absolute inset-0 origin-[25%_75%] [transform-style:preserve-3d]"
          style={{
            transform: "translateY(calc(var(--away, 0) * 32px)) scale(calc(1 - var(--away, 0) * 0.5))",
            opacity: "calc(1 - var(--gone, 0))",
          }}
        >
          {/* The left half: its bottom stays, its top folds down onto it */}
          <div className={QUARTER} style={{ ...SIZE, left: 0, top: HALF }}>
            <Face x={0} y={HALF} rounded="BottomLeft" back="rotateY(180deg)" front={[UNDER]} behind={[]} />
          </div>
          <div
            className={`${QUARTER} origin-bottom`}
            style={{
              ...SIZE,
              left: 0,
              top: 0,
              transform: "translateZ(calc(var(--f1, 0) * 0.5px)) rotateX(calc(var(--f1, 0) * -180deg))",
            }}
          >
            <Face
              x={0}
              y={0}
              rounded="TopLeft"
              flippedRounded="BottomLeft"
              back="rotateX(180deg)"
              front={[TURNING]}
              behind={[shade("--f1", 0.12)]}
            />
          </div>

          {/* The right half, folded as one over the left, and lifted just
              clear of it so the layers never fight */}
          <div
            className={`${QUARTER} origin-left`}
            style={{
              width: HALF,
              height: PHOTO,
              left: HALF,
              top: 0,
              transform: "translateZ(calc(var(--f2, 0) * 2px)) rotateY(calc(var(--f2, 0) * -180deg))",
            }}
          >
            <div className={QUARTER} style={{ ...SIZE, left: 0, top: HALF }}>
              <Face
                x={HALF}
                y={HALF}
                rounded="BottomRight"
                flippedRounded="BottomLeft"
                back="rotateY(180deg)"
                front={[UNDER, shade("--f2", 0.28)]}
                behind={[shade("--f2", 0.12)]}
              />
            </div>
            <div
              className={`${QUARTER} origin-bottom`}
              style={{
                ...SIZE,
                left: 0,
                top: 0,
                transform: "translateZ(calc(var(--f1, 0) * 0.5px)) rotateX(calc(var(--f1, 0) * -180deg))",
              }}
            >
              <Face
                x={HALF}
                y={0}
                rounded="TopRight"
                flippedRounded="BottomRight"
                back="rotateX(180deg)"
                front={[TURNING]}
                behind={[shade("--f1", 0.12), shade("--f2", 0.12)]}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <HoldButton {...button} />
      </div>
      <p className="mt-4 text-center text-sm text-faint">Hold, and fold it away</p>
    </div>
  );
}
