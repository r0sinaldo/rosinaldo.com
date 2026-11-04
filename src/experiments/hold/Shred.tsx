"use client";

import { useEffect, useRef } from "react";
import { seeded } from "@/lib/Random";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HoldButton } from "./Hold";
import { fitCanvas, offscreen, PHOTO, PHOTO_LABEL, photoCanvas } from "./Photo";
import { useProgressHold } from "./ProgressHold";

const STRIPS = 8;
const STRIP = PHOTO / STRIPS;
// The photo sits on the slot; the strips come out below it
const PAD = { left: 24, right: 24, top: 0, bottom: 72 };
const WIDTH = PAD.left + PHOTO + PAD.right;
const HEIGHT = PAD.top + PHOTO + PAD.bottom;
const SLOT = PAD.top + PHOTO;
// How far below the slot the strips fade out, as into a bin
const FADE = 44;
// How long, past the end of the hold, the last strips take to fall away
const TAIL = 0.35;

type Scene = {
  context: CanvasRenderingContext2D;
  // The strips, drawn on their own layer to be faded towards the bottom
  below: CanvasRenderingContext2D;
  photo: HTMLCanvasElement;
  scale: number;
  // Each strip's own curl as it hangs, and how heavily it falls
  curl: Float32Array;
  weight: Float32Array;
};

function draw(scene: Scene, progress: number, reducedMotion: boolean) {
  const { context, below, photo, scale, curl, weight } = scene;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  if (reducedMotion) {
    context.globalAlpha = Math.max(0, 1 - progress);
    context.drawImage(photo, PAD.left, PAD.top, PHOTO, PHOTO);
    context.globalAlpha = 1;
    return;
  }

  // Fed in at a steady pace, with the fill: by the end of the hold the last
  // edge of the photo has gone through
  const fed = Math.min(progress, 1) * PHOTO;
  // After it, the strips drop, gathering speed
  const fall = Math.max(0, progress - 1) / TAIL;

  // What has not gone in yet: the top of the photo, still whole, above the slot
  const rest = PHOTO - fed;
  if (rest > 0) {
    context.drawImage(photo, 0, 0, PHOTO * scale, rest * scale, PAD.left, SLOT - rest, PHOTO, rest);
  }

  // What has: strips hanging from the slot, the bottom of the photo leading
  below.clearRect(0, 0, WIDTH, HEIGHT);
  if (fed > 0) {
    // Cut strips part a little and start to curl once they are clear
    const parted = Math.min(fed / 28, 1);
    for (let i = 0; i < STRIPS; i++) {
      const fromCentre = i - (STRIPS - 1) / 2;
      below.save();
      below.translate(
        PAD.left + i * STRIP + STRIP / 2 + fromCentre * 1.5 * parted,
        SLOT + fall * fall * (110 + 50 * weight[i]),
      );
      below.rotate(fromCentre * 0.01 * parted + curl[i] * parted + curl[i] * 5 * fall);
      below.drawImage(photo, i * STRIP * scale, rest * scale, STRIP * scale, fed * scale, -STRIP / 2, 0, STRIP, fed);
      // Every other strip a touch darker, so they read as separate pieces
      if (i % 2) {
        below.globalCompositeOperation = "source-atop";
        below.fillStyle = "rgb(0 0 0 / 0.06)";
        below.fillRect(-STRIP / 2, 0, STRIP, fed);
        below.globalCompositeOperation = "source-over";
      }
      below.restore();
    }
    // Faded out below the slot, as if falling into the dark of a bin
    const fade = below.createLinearGradient(0, SLOT, 0, SLOT + FADE);
    fade.addColorStop(0, "black");
    fade.addColorStop(1, "transparent");
    below.globalCompositeOperation = "destination-in";
    below.fillStyle = fade;
    below.fillRect(0, 0, WIDTH, HEIGHT);
    below.globalCompositeOperation = "source-over";
  }
  context.drawImage(below.canvas, 0, 0, WIDTH, HEIGHT);
}

export default function Shred() {
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene>(null);
  const { phase, root, button } = useProgressHold(
    (progress) => scene.current && draw(scene.current, progress, reducedMotion),
    reducedMotion ? 0 : TAIL,
  );

  useEffect(() => {
    if (!canvas.current) return;
    const { context } = fitCanvas(canvas.current, WIDTH, HEIGHT);
    const { photo, scale } = photoCanvas();
    const random = seeded(5);
    const curl = Float32Array.from({ length: STRIPS }, () => (random() - 0.5) * 0.05);
    const weight = Float32Array.from({ length: STRIPS }, random);
    scene.current = { context, below: offscreen(WIDTH, HEIGHT).context, photo, scale, curl, weight };
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
          style={{ left: -PAD.left, top: -PAD.top, width: WIDTH, height: HEIGHT }}
        />
        {/* The slot: a hairline the photo goes into, there only while something is going through it */}
        <div
          aria-hidden
          className="absolute -inset-x-4 top-full h-0.5 rounded-full bg-foreground"
          style={{
            opacity: phase === "idle" || phase === "resetting" ? 0 : 0.42,
            transition: `opacity ${phase === "holding" ? 150 : 300}ms ease-out`,
          }}
        />
      </div>
      <div className="mt-12">
        <HoldButton {...button} />
      </div>
      <p className="mt-4 text-center text-sm text-faint">Hold, and feed it through</p>
    </div>
  );
}
