"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  BARS,
  BONES,
  CONTENT,
  Frame,
  Layout,
  Picture,
  TEXT_X,
  useLoading,
  usePicture,
  useTextWidths,
} from "./Skeleton";

const TIMES = [2000];
// Each piece first takes the shape of what it held the place of, then gives
// way to it
const SHAPE = 420;
const STAGGER = 60;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

type Bar = { top: number; height: number; width: number; x: number };

// A line of text: its bar grows or shrinks to exactly the text's box (its
// width measured as --w), squares its ends, and then dissolves into the text
function Line({ shown, delay, bar, children }: { shown: boolean; delay: number; bar: Bar; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const shape = reducedMotion ? 0 : SHAPE;
  return (
    <div data-line className="absolute inset-0">
      <div
        className="bone absolute left-0"
        style={
          {
            "--x": `${bar.x}px`,
            top: shown ? 0 : bar.top,
            height: shown ? "100%" : bar.height,
            width: shown ? "var(--w)" : bar.width,
            borderRadius: shown ? 4 : 999,
            opacity: shown ? 0 : 1,
            transition: shown
              ? [
                  ...["top", "height", "width", "border-radius"].map((p) => `${p} ${shape}ms ${EASE} ${delay}ms`),
                  `opacity 300ms ease-out ${delay + shape}ms`,
                ].join(", ")
              : `top 250ms ${EASE}, height 250ms ${EASE}, width 250ms ${EASE}, border-radius 250ms ${EASE}, opacity 150ms ease-out`,
          } as CSSProperties
        }
      />
      <div
        data-text
        className="absolute top-0 left-0"
        style={{
          opacity: shown ? 1 : 0,
          filter: shown || reducedMotion ? "blur(0)" : "blur(3px)",
          transition: shown
            ? `opacity 350ms ease-out ${delay + shape * 0.8}ms, filter 350ms ease-out ${delay + shape * 0.8}ms`
            : `opacity 120ms ease-out`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Morph() {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  useTextWidths(root);
  const reducedMotion = useReducedMotion();
  const shown = !loading;
  const shape = reducedMotion ? 0 : SHAPE;

  return (
    <Frame root={root} loading={loading} replay={replay}>
      <Layout
        avatar={
          <>
            {BONES.avatar}
            {/* The avatar opens out of its circle, from the middle */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: shown || reducedMotion ? "circle(72% at 50% 50%)" : "circle(0% at 50% 50%)",
                transition: shown ? `clip-path 520ms cubic-bezier(0.23, 1, 0.32, 1)` : `clip-path 200ms ease-in`,
              }}
            >
              {CONTENT.avatar}
            </div>
          </>
        }
        name={
          <Line shown={shown} delay={STAGGER} bar={{ top: 4, height: 12, width: BARS.name, x: TEXT_X }}>
            {CONTENT.name}
          </Line>
        }
        handle={
          <Line shown={shown} delay={STAGGER * 2} bar={{ top: 3, height: 10, width: BARS.handle, x: TEXT_X }}>
            {CONTENT.handle}
          </Line>
        }
        lines={BARS.lines.map((width, i) => (
          <Line key={i} shown={shown} delay={STAGGER * (3 + i)} bar={{ top: 4, height: 12, width, x: 0 }}>
            {CONTENT.lines[i]}
          </Line>
        ))}
        picture={
          <>
            {/* The block takes on the picture's own average colour first, so
                the picture arrives into its own light rather than out of grey */}
            <div
              className="bone absolute inset-0 rounded-[10px]"
              style={{
                backgroundColor: shown ? "var(--picture-tone)" : undefined,
                transition: shown
                  ? `background-color ${shape}ms ${EASE} ${STAGGER * 5}ms`
                  : `background-color 200ms ease-out`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                opacity: shown ? 1 : 0,
                filter: shown || reducedMotion ? "blur(0)" : "blur(6px)",
                scale: shown || reducedMotion ? "1" : "1.02",
                transition: shown
                  ? `opacity 450ms ease-out ${STAGGER * 5 + shape * 0.7}ms, filter 600ms ease-out ${STAGGER * 5 + shape * 0.7}ms, scale 700ms cubic-bezier(0.23, 1, 0.32, 1) ${STAGGER * 5 + shape * 0.7}ms`
                  : `opacity 150ms ease-out`,
              }}
            >
              <Picture />
            </div>
          </>
        }
      />
    </Frame>
  );
}
