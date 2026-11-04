"use client";

import { useEffect, useRef } from "react";
import { seeded } from "@/lib/Random";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HoldButton } from "./Hold";
import { type Cells, fitCanvas, offscreen, PHOTO, PHOTO_LABEL, photoCells, photoCanvas } from "./Photo";
import { useProgressHold } from "./ProgressHold";

// Room above the photo for the sparks to rise into
const PAD = { left: 24, right: 24, top: 72, bottom: 8 };
const WIDTH = PAD.left + PHOTO + PAD.right;
const HEIGHT = PAD.top + PHOTO + PAD.bottom;
const CELL = 2;
// Shares of the hold: how long a spot browns before the flame reaches it,
// how long it glows as it burns through, and how long a spark lives
const CHAR = 0.16;
const GLOW = 0.05;
const SPARK = 0.32;
// The share of spots that throw a spark as they burn
const SPARKS = 0.2;

// What paper turns to just ahead of the flame
const SCORCH = "#2e1608";
// A burning spot or spark cools along these: white-hot, orange, deep red
const HEAT = [
  [255, 238, 176],
  [255, 148, 46],
  [150, 38, 10],
];

function heat(t: number, alpha: number) {
  const [from, to, k] = t < 0.4 ? [HEAT[0], HEAT[1], t / 0.4] : [HEAT[1], HEAT[2], (t - 0.4) / 0.6];
  const mix = (i: number) => Math.round(from[i] + (to[i] - from[i]) * k);
  return `rgb(${mix(0)} ${mix(1)} ${mix(2)} / ${alpha.toFixed(3)})`;
}

// Smooth noise: random values on a coarse grid, blended between, so the
// burning edge wanders like a real one instead of fizzing pixel by pixel
function smoothNoise(random: () => number, spacing: number) {
  const size = Math.ceil(PHOTO / spacing) + 2;
  const grid = Array.from({ length: size * size }, random);
  const ease = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const gx = x / spacing;
    const gy = y / spacing;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = ease(gx - ix);
    const fy = ease(gy - iy);
    const at = (i: number, j: number) => grid[j * size + i];
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

type Scene = {
  context: CanvasRenderingContext2D;
  photo: HTMLCanvasElement;
  whole: CanvasRenderingContext2D;
  cells: Cells;
  // When, in the hold's progress, the flame reaches each spot
  ignite: Float32Array;
  // The spots that throw a spark, and where each spark goes
  sparks: number[];
  driftX: Float32Array;
  rise: Float32Array;
  sway: Float32Array;
};

function draw(scene: Scene, progress: number, reducedMotion: boolean) {
  const { context, photo, whole, cells, ignite, sparks, driftX, rise, sway } = scene;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  if (reducedMotion) {
    context.globalAlpha = Math.max(0, 1 - progress);
    context.drawImage(photo, PAD.left, PAD.top, PHOTO, PHOTO);
    context.globalAlpha = 1;
    return;
  }

  whole.clearRect(0, 0, PHOTO, PHOTO);
  whole.drawImage(photo, 0, 0, PHOTO, PHOTO);
  // Scorching ahead of the flame, only where there is photo (source-atop),
  // deepening fast as the flame gets close
  whole.globalCompositeOperation = "source-atop";
  whole.fillStyle = SCORCH;
  for (let i = 0; i < cells.count; i++) {
    const lead = ignite[i] - progress;
    if (lead <= 0 || lead >= CHAR) continue;
    whole.globalAlpha = (1 - lead / CHAR) ** 2 * 0.92;
    whole.fillRect(cells.x[i], cells.y[i], CELL, CELL);
  }
  // Burning through: each spot glows white-hot, cools, and is gone
  whole.globalCompositeOperation = "source-over";
  for (let i = 0; i < cells.count; i++) {
    const burnt = progress - ignite[i];
    if (burnt < 0) continue;
    whole.clearRect(cells.x[i], cells.y[i], CELL, CELL);
    if (burnt >= GLOW) continue;
    const t = burnt / GLOW;
    whole.globalAlpha = 1;
    whole.fillStyle = heat(t, cells.a[i] * (1 - t * t));
    whole.fillRect(cells.x[i], cells.y[i], CELL, CELL);
  }
  whole.globalAlpha = 1;
  context.drawImage(whole.canvas, PAD.left, PAD.top, PHOTO, PHOTO);

  // A soft glow around the burning edge, as light thrown on the page
  for (let i = 0; i < cells.count; i++) {
    const burnt = progress - ignite[i];
    if (burnt < 0 || burnt >= GLOW) continue;
    context.fillStyle = heat(0.3, 0.14 * (1 - burnt / GLOW));
    context.fillRect(PAD.left + cells.x[i] - 2, PAD.top + cells.y[i] - 2, CELL + 4, CELL + 4);
  }

  // Sparks: thrown up from the edge, swaying, cooling from white to red
  for (const i of sparks) {
    const age = (progress - ignite[i]) / SPARK;
    if (age <= 0 || age >= 1) continue;
    const travel = 1 - (1 - age) ** 2;
    const size = 1.6 * (1 - 0.5 * age);
    context.fillStyle = heat(age, (1 - age) ** 1.2);
    context.fillRect(
      PAD.left + cells.x[i] + travel * driftX[i] + Math.sin(age * 7 + sway[i]) * 2.5,
      PAD.top + cells.y[i] - travel * rise[i],
      size,
      size,
    );
  }
}

export default function Burn() {
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene>(null);
  const { phase, root, button } = useProgressHold(
    (progress) => scene.current && draw(scene.current, progress, reducedMotion),
    reducedMotion ? 0 : SPARK,
  );

  useEffect(() => {
    if (!canvas.current) return;
    const { context } = fitCanvas(canvas.current, WIDTH, HEIGHT);
    const { photo, image, scale } = photoCanvas();
    const cells = photoCells(image, scale, CELL);
    const random = seeded(11);
    const broad = smoothNoise(random, 18);
    const fine = smoothNoise(random, 6);
    const ignite = new Float32Array(cells.count);
    const sparks: number[] = [];
    const driftX = new Float32Array(cells.count);
    const rise = new Float32Array(cells.count);
    const sway = new Float32Array(cells.count);
    for (let i = 0; i < cells.count; i++) {
      const x = cells.x[i];
      const y = cells.y[i];
      // From the bottom up, the edge wandering with the noise. Scaled so the
      // last spot has finished burning exactly as the hold completes
      const height = 1 - (y + CELL) / PHOTO;
      const wander = 0.7 * broad(x, y) + 0.3 * fine(x, y);
      ignite[i] = (1 - GLOW) * (0.84 * height + 0.16 * wander);
      if (random() < SPARKS) sparks.push(i);
      driftX[i] = (random() - 0.5) * 16;
      rise[i] = 30 + random() * 44;
      sway[i] = random() * Math.PI * 2;
    }
    scene.current = {
      context,
      photo,
      whole: offscreen(PHOTO, PHOTO).context,
      cells,
      ignite,
      sparks,
      driftX,
      rise,
      sway,
    };
    draw(scene.current, 0, false);
  }, []);

  return (
    <div ref={root} className="flex flex-col items-center">
      <div
        style={{ width: PHOTO, height: PHOTO }}
        className={`relative ${phase === "resetting" ? "motion-safe:animate-label" : ""}`}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={PHOTO_LABEL}
          className="pointer-events-none absolute max-w-none"
          style={{
            left: -PAD.left,
            top: -PAD.top,
            width: WIDTH,
            height: HEIGHT,
            maskImage: "linear-gradient(to bottom, transparent 12px, black 56px)",
          }}
        />
      </div>
      <div className="mt-12">
        <HoldButton {...button} />
      </div>
      <p className="mt-4 text-center text-sm text-faint">Hold, and watch it burn away</p>
    </div>
  );
}
