"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  BONES,
  CONTENT,
  Frame,
  Layout,
  Picture,
  POST,
  TEXT_X,
  useLoading,
  usePicture,
  useTextWidths,
} from "./Skeleton";

const TIMES = [1800];
// How long a character takes to write, and how far into a line the next one
// starts, so it reads as one hand moving on
const PER_CHARACTER = 13;
const OVERLAP = 0.75;
// The soft edge of the ink
const EDGE = 20;
const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";

// The order things are written in, and how long each takes
const STEPS = [
  { part: "avatar", duration: 320 },
  { part: "name", duration: POST.name.length * PER_CHARACTER },
  { part: "handle", duration: POST.handle.length * PER_CHARACTER },
  ...POST.lines.map((line, i) => ({ part: `line${i}`, duration: line.length * PER_CHARACTER })),
  { part: "picture", duration: 560 },
];
const START: Record<string, number> = {};
STEPS.reduce((at, { part, duration }) => {
  START[part] = at;
  return at + duration * OVERLAP;
}, 0);
const DURATION = Object.fromEntries(STEPS.map(({ part, duration }) => [part, duration]));

// The ink's edge as a mask: what is written so far (`ink`), or what is left
// of the bone (`paper`). --reveal goes from 0 to 1 along the line
function mask(kind: "ink" | "paper", shape: "line" | "down" | "round") {
  const at = `calc(var(--reveal) * (100% + ${EDGE}px) - ${EDGE}px)`;
  const to = `calc(var(--reveal) * (100% + ${EDGE}px))`;
  const [solid, clear] = kind === "ink" ? ["#000", "transparent"] : ["transparent", "#000"];
  const stops = `${solid} ${at}, ${clear} ${to}`;
  if (shape === "round") return `radial-gradient(circle at center, ${stops})`;
  return `linear-gradient(${shape === "down" ? "180deg" : "90deg"}, ${stops})`;
}

function useWriting(shown: boolean, part: string): CSSProperties {
  const reducedMotion = useReducedMotion();
  return {
    "--reveal": shown ? 1 : 0,
    transition: shown
      ? `--reveal ${reducedMotion ? 0 : DURATION[part]}ms ${EASE} ${reducedMotion ? 0 : START[part]}ms`
      : `--reveal 200ms ease-out`,
  } as CSSProperties;
}

// A line of text written in over its bone, which already has the text's exact
// width (--w): the bone recedes just ahead of the ink
function WrittenLine({
  shown,
  part,
  bar,
  children,
}: {
  shown: boolean;
  part: string;
  bar: { top: number; height: number; x: number };
  children: ReactNode;
}) {
  const writing = useWriting(shown, part);
  return (
    <div data-line className="absolute inset-0">
      <div
        className="bone absolute left-0 rounded-full"
        style={
          {
            "--x": `${bar.x}px`,
            top: bar.top,
            height: bar.height,
            width: "var(--w)",
            maskImage: mask("paper", "line"),
            ...writing,
          } as CSSProperties
        }
      />
      <div data-text className="absolute top-0 left-0" style={{ maskImage: mask("ink", "line"), ...writing }}>
        {children}
      </div>
    </div>
  );
}

// The avatar and the picture, written the same way: from the middle out, and
// from the top down
function WrittenArea({
  shown,
  part,
  shape,
  bone,
  children,
}: {
  shown: boolean;
  part: string;
  shape: "down" | "round";
  bone: ReactNode;
  children: ReactNode;
}) {
  const writing = useWriting(shown, part);
  return (
    <>
      <div className="absolute inset-0" style={{ maskImage: mask("paper", shape), ...writing }}>
        {bone}
      </div>
      <div className="absolute inset-0" style={{ maskImage: mask("ink", shape), ...writing }}>
        {children}
      </div>
    </>
  );
}

export default function Ink() {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  useTextWidths(root);
  const shown = !loading;

  return (
    <Frame root={root} loading={loading} replay={replay}>
      <Layout
        avatar={
          <WrittenArea shown={shown} part="avatar" shape="round" bone={BONES.avatar}>
            {CONTENT.avatar}
          </WrittenArea>
        }
        name={
          <WrittenLine shown={shown} part="name" bar={{ top: 4, height: 12, x: TEXT_X }}>
            {CONTENT.name}
          </WrittenLine>
        }
        handle={
          <WrittenLine shown={shown} part="handle" bar={{ top: 3, height: 10, x: TEXT_X }}>
            {CONTENT.handle}
          </WrittenLine>
        }
        lines={CONTENT.lines.map((line, i) => (
          <WrittenLine key={i} shown={shown} part={`line${i}`} bar={{ top: 4, height: 12, x: 0 }}>
            {line}
          </WrittenLine>
        ))}
        picture={
          <WrittenArea shown={shown} part="picture" shape="down" bone={BONES.picture}>
            <Picture />
          </WrittenArea>
        }
      />
    </Frame>
  );
}
