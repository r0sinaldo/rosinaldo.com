"use client";

import { useEffect, useRef } from "react";
import { seeded } from "@/lib/Random";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HoldButton } from "./Hold";
import { type Cells, fitCanvas, offscreen, PHOTO, PHOTO_LABEL, photoCells, photoCanvas } from "./Photo";
import { useProgressHold } from "./ProgressHold";

// The photo, and the room around it its grains can blow into (mostly up,
// drifting right with the wind)
const PAD = { left: 24, right: 64, top: 72, bottom: 16 };
const WIDTH = PAD.left + PHOTO + PAD.right;
const HEIGHT = PAD.top + PHOTO + PAD.bottom;
// Grains are squares of this many CSS pixels
const GRAIN = 2;
// How long a loose grain takes to blow away, as a share of the hold. The
// front that frees them crosses the photo with the button's fill, so the last
// of the photo comes loose exactly as the hold completes; the dust still in
// the air then settles while the button says it is done
const LIFE = 0.35;
// How ragged the front is, as a share of the hold
const RAGGED = 0.07;

type Scene = {
  context: CanvasRenderingContext2D;
  photo: HTMLCanvasElement;
  // What is left of the photo, rebuilt each frame
  whole: CanvasRenderingContext2D;
  grains: Cells;
  // When, in the hold's progress, each grain comes loose
  start: Float32Array;
  // How far the wind takes it, and its own sway
  driftX: Float32Array;
  driftY: Float32Array;
  sway: Float32Array;
};

// The photo at a given progress of the hold: a pure function of it, so going
// back (letting go) puts every grain back exactly where it came from
function draw(scene: Scene, progress: number, reducedMotion: boolean) {
  const { context, photo, whole, grains, start, driftX, driftY, sway } = scene;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  if (reducedMotion) {
    context.globalAlpha = Math.max(0, 1 - progress);
    context.drawImage(photo, PAD.left, PAD.top, PHOTO, PHOTO);
    context.globalAlpha = 1;
    return;
  }
  // What is still whole is the photo itself, sharp, with the loose grains
  // cut out of it on whole device pixels
  whole.clearRect(0, 0, PHOTO, PHOTO);
  whole.drawImage(photo, 0, 0, PHOTO, PHOTO);
  for (let i = 0; i < grains.count; i++) {
    if (progress > start[i]) whole.clearRect(grains.x[i], grains.y[i], GRAIN, GRAIN);
  }
  // The dust first, the whole part over it: dust passes behind what has not
  // come loose yet, so the photo only ever goes as fast as the fill
  for (let i = 0; i < grains.count; i++) {
    const age = (progress - start[i]) / LIFE;
    if (age <= 0 || age >= 1) continue;
    // Snatched quickly, then carried, slowing, as it fades and shrinks
    const travel = 1 - (1 - age) ** 3;
    const size = GRAIN * (1 - 0.45 * age);
    context.globalAlpha = (1 - age) ** 1.5;
    context.fillStyle = grains.colour[i];
    context.fillRect(
      PAD.left + grains.x[i] + travel * driftX[i] + Math.sin(age * 5 + sway[i]) * 1.5,
      PAD.top + grains.y[i] - travel * driftY[i],
      size,
      size,
    );
  }
  context.globalAlpha = 1;
  context.drawImage(whole.canvas, PAD.left, PAD.top, PHOTO, PHOTO);
}

export default function Dissolve() {
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene>(null);
  const { phase, root, button } = useProgressHold(
    (progress) => scene.current && draw(scene.current, progress, reducedMotion),
    reducedMotion ? 0 : LIFE,
  );

  // Paint the photo once and grind it into grains
  useEffect(() => {
    if (!canvas.current) return;
    const { context } = fitCanvas(canvas.current, WIDTH, HEIGHT);
    const { photo, image, scale } = photoCanvas();
    const grains = photoCells(image, scale, GRAIN);
    const random = seeded(7);
    const start = new Float32Array(grains.count);
    const driftX = new Float32Array(grains.count);
    const driftY = new Float32Array(grains.count);
    const sway = new Float32Array(grains.count);
    for (let i = 0; i < grains.count; i++) {
      // The front sweeps left to right in step with the fill, its edge ragged
      // by a narrow band, so it never runs ahead; every grain is loose by the
      // end (start < 1)
      start[i] = (1 - RAGGED) * (grains.x[i] / PHOTO) + RAGGED * random();
      // Mostly up, only a little with the wind
      driftX[i] = 8 + random() * 30;
      driftY[i] = 22 + random() * 46;
      sway[i] = random() * Math.PI * 2;
    }
    scene.current = { context, photo, whole: offscreen(PHOTO, PHOTO).context, grains, start, driftX, driftY, sway };
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
            // Dust rising this high thins out to nothing instead of being cut
            // off by the edge of the stage
            maskImage: "linear-gradient(to bottom, transparent 12px, black 56px)",
          }}
        />
      </div>
      <div className="mt-12">
        <HoldButton {...button} />
      </div>
      <p className="mt-4 text-center text-sm text-faint">Hold, and watch it come apart</p>
    </div>
  );
}
