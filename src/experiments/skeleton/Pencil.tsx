"use client";

import { useEffect, useRef, useState } from "react";
import { seeded } from "@/lib/Random";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { MARGIN, type Part, type Raster, useRaster } from "./Raster";
import { BONE_LAYOUT, CONTENT_LAYOUT, Crossfade, Frame, useLoading, usePicture } from "./Skeleton";

const TIMES = [2000];
// Coming in to the first piece, and moving between pieces with the lead lifted
const ENTER = 260;
const LIFT = 110;
// Once it is all drawn, colour comes in over the sketch
const INK = 500;
// The pencil, its lead at the tip on the left, lying back up and to the right
const ANGLE = -38;

type Point = [number, number];
type Stroke = { points: Point[]; lengths: number[]; width: number; duration: number; draw: boolean };

// How each piece is drawn: tight zigzags, the way a hand writes a line or
// fills in a shape, slanting as a hand does. Text is written along its line;
// the avatar filled in; the picture hatched, its strokes a little apart so the
// paper shows between them
const STYLE = {
  text: { step: 2.2, width: 2.6, inset: 3, slant: 0.1 },
  avatar: { step: 2.6, width: 3, inset: 0, slant: 0.3 },
  picture: { step: 3.4, width: 3, inset: 0, slant: 0.35 },
};

function scribble(part: Part): Point[] {
  const { step, inset, slant } = STYLE[part.kind];
  const top = part.y + inset;
  const bottom = part.y + part.height - inset;
  const lean = (bottom - top) * slant;
  const points: Point[] = [];
  for (let x = part.x - lean, i = 0; x <= part.x + part.width; x += step, i++) {
    points.push(i % 2 ? [x + lean, top] : [x, bottom]);
  }
  return points;
}

function stroke(points: Point[], width: number, duration: number, draw: boolean): Stroke {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, lengths, width, duration, draw };
}

// The whole drawing, piece by piece, with the moves between them
function plan(raster: Raster) {
  const strokes: Stroke[] = [];
  let from: Point = [raster.width + 40, -40];
  raster.parts.forEach((part, i) => {
    const points = scribble(part);
    strokes.push(stroke([from, points[0]], 0, i ? LIFT : ENTER, false));
    const duration = part.kind === "picture" ? 1100 : part.kind === "avatar" ? 280 : 120 + part.width * 1.1;
    strokes.push(stroke(points, STYLE[part.kind].width, duration, true));
    from = points[points.length - 1];
  });
  return strokes;
}

// Where along a stroke the lead is, `distance` in
function pointAt(stroke: Stroke, distance: number): Point {
  const { points, lengths } = stroke;
  let i = 1;
  while (i < points.length - 1 && lengths[i] < distance) i++;
  const span = lengths[i] - lengths[i - 1] || 1;
  const k = Math.min(Math.max((distance - lengths[i - 1]) / span, 0), 1);
  return [
    points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k,
    points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k,
  ];
}

// The post as a pencil sketch: graphite where the post has colour, darker
// where it is darker, its edges drawn firmly, as a hand outlines before it
// shades, and the grain of the paper in it
function sketch(raster: Raster) {
  const source = raster.content;
  const output = document.createElement("canvas");
  output.width = source.width;
  output.height = source.height;
  const pixels = source.getContext("2d")!.getImageData(0, 0, source.width, source.height);
  const data = pixels.data;
  const random = seeded(5);
  const [r, g, b] = raster.foreground.map((value) => value * 255);
  const { width, height } = source;
  const tone = new Float32Array(width * height);
  for (let i = 0; i < tone.length; i++) {
    const alpha = data[i * 4 + 3] / 255;
    const light = (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255;
    tone[i] = alpha * (1 - light * 0.85);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const alpha = data[i * 4 + 3] / 255;
      if (!alpha) continue;
      const at = (dx: number, dy: number) =>
        tone[Math.min(Math.max(y + dy, 0), height - 1) * width + Math.min(Math.max(x + dx, 0), width - 1)];
      const edge = Math.hypot(at(1, 0) - at(-1, 0), at(0, 1) - at(0, -1));
      const graphite = Math.min(1, alpha * 0.12 + tone[i] * 0.5 + edge * 1.6) * (0.72 + 0.28 * random());
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = Math.round(graphite * 255);
    }
  }
  output.getContext("2d")!.putImageData(pixels, 0, 0);
  return output;
}

function PencilShape() {
  return (
    <svg aria-hidden width="80" height="14" viewBox="0 0 80 14" className="block">
      <path d="M0 7 L6.5 5.2 L6.5 8.8 Z" fill="#2b2b30" />
      <path d="M6.5 5.2 L16 1 L16 13 L6.5 8.8 Z" fill="#ecd0a4" />
      <path d="M6.5 7 L16 7 L16 13 L6.5 8.8 Z" fill="#d9b886" />
      <rect x="16" y="1" width="52" height="12" fill="#f2b630" />
      <rect x="16" y="1" width="52" height="3.6" fill="#f8cf5c" />
      <rect x="16" y="9.4" width="52" height="3.6" fill="#d8961c" />
      <rect x="68" y="0.5" width="6" height="13" fill="#c8ccd4" />
      <path d="M70 0.5 V13.5 M72 0.5 V13.5" stroke="#a3a8b2" strokeWidth="0.6" />
      <rect x="73.5" y="1" width="6.5" height="12" rx="2" fill="#ee8d93" />
    </svg>
  );
}

// Once the post has loaded, a pencil draws it: writing each line of text,
// filling in the avatar, hatching the picture, then the colour comes in over
// the sketch
export default function Pencil() {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const pencil = useRef<HTMLDivElement>(null);
  const { content, bones, raster } = useRaster(!reducedMotion);
  const [drawn, setDrawn] = useState(false);
  const shown = !loading;

  useEffect(() => {
    const display = canvas.current?.getContext("2d");
    const lead = pencil.current;
    if (!raster || !display || !lead) return;
    display.canvas.width = raster.content.width;
    display.canvas.height = raster.content.height;
    display.clearRect(0, 0, display.canvas.width, display.canvas.height);
    const place = ([x, y]: Point, tilt = 0, lifted = false) => {
      lead.style.transform = `translate(${x}px, ${y - 7}px) rotate(${ANGLE + tilt}deg) scale(${lifted ? 1.04 : 1})`;
      lead.style.filter = `drop-shadow(${lifted ? "3px 6px 4px" : "1.5px 3px 2px"} rgb(0 0 0 / 0.22))`;
    };
    lead.style.transition = "none";
    lead.style.opacity = "0";
    place([raster.width + 40, -40], 0, true);
    if (!shown) return;

    const strokes = plan(raster);
    const ends = strokes.reduce<number[]>((all, { duration }) => [...all, (all.at(-1) ?? 0) + duration], []);
    const total = ends.at(-1)!;
    const art = sketch(raster);
    const mask = document.createElement("canvas").getContext("2d")!;
    mask.canvas.width = display.canvas.width;
    mask.canvas.height = display.canvas.height;
    mask.scale(raster.scale, raster.scale);
    mask.lineCap = "round";
    mask.lineJoin = "round";
    const random = seeded(9);
    // How far the lead has drawn: which stroke, how far along it
    let reached = { stroke: 0, distance: 0 };
    lead.style.opacity = "1";

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(now - start, total);
      const index = ends.findIndex((end) => elapsed <= end);
      const current = strokes[index];
      const into = (elapsed - (ends[index] - current.duration)) / current.duration;
      const distance = into * current.lengths.at(-1)!;

      // Draw what the lead has covered since the last frame, a little
      // unevenly, as graphite goes down
      for (let s = reached.stroke; s <= index; s++) {
        const { draw, width, lengths } = strokes[s];
        if (!draw) continue;
        const from = s === reached.stroke ? reached.distance : 0;
        const to = s === index ? distance : lengths.at(-1)!;
        if (to <= from) continue;
        mask.strokeStyle = `rgb(0 0 0 / ${0.78 + random() * 0.22})`;
        mask.lineWidth = width * (0.9 + random() * 0.2);
        mask.beginPath();
        const steps = Math.max(2, Math.ceil((to - from) / 1.5));
        for (let k = 0; k <= steps; k++) {
          const [x, y] = pointAt(strokes[s], from + ((to - from) * k) / steps);
          if (k) mask.lineTo(x, y);
          else mask.moveTo(x, y);
        }
        mask.stroke();
      }
      reached = { stroke: index, distance };

      display.clearRect(0, 0, display.canvas.width, display.canvas.height);
      display.globalCompositeOperation = "source-over";
      display.drawImage(art, 0, 0);
      display.globalCompositeOperation = "destination-in";
      display.drawImage(mask.canvas, 0, 0);
      display.globalCompositeOperation = "source-over";

      const [x, y] = pointAt(current, distance);
      // A hand's slight rock as it draws
      place([x, y], current.draw ? Math.sin(now / 45) * 1.5 : 0, !current.draw);

      if (elapsed < total) {
        frame = requestAnimationFrame(tick);
        return;
      }
      // Done: the pencil lifts away and the colour comes in
      lead.style.transition = `transform ${INK}ms cubic-bezier(0.5, 0, 0.75, 0), opacity ${INK}ms ease-in`;
      place([raster.width + 60, -60], 0, true);
      lead.style.opacity = "0";
      setDrawn(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [raster, shown]);

  if (reducedMotion) {
    return (
      <Frame root={root} loading={loading} replay={replay}>
        <Crossfade shown={shown} />
      </Frame>
    );
  }

  return (
    <Frame
      root={root}
      loading={loading}
      replay={() => {
        setDrawn(false);
        replay();
      }}
    >
      <div className="relative">
        <div
          ref={bones}
          aria-hidden
          className="absolute inset-0"
          style={{ opacity: shown ? 0 : 1, transition: `opacity ${shown ? 250 : 150}ms ease-out` }}
        >
          {BONE_LAYOUT}
        </div>
        <div ref={content} style={{ opacity: drawn ? 1 : 0, transition: drawn ? `opacity ${INK}ms ease-out` : "none" }}>
          {CONTENT_LAYOUT}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: -MARGIN, top: -MARGIN, width: raster?.width, height: raster?.height }}
        >
          <canvas
            ref={canvas}
            className="absolute inset-0 size-full"
            style={{
              opacity: drawn ? 0 : 1,
              transition: drawn ? `opacity ${INK}ms ease-out ${INK / 3}ms` : "none",
            }}
          />
          <div ref={pencil} className="absolute top-0 left-0 origin-[0_7px] opacity-0 will-change-transform">
            <PencilShape />
          </div>
        </div>
      </div>
    </Frame>
  );
}
