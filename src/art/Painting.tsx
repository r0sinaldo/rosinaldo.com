"use client";

import { useEffect, useRef } from "react";
import { readTokens, rgbChannels } from "@/lib/Tokens";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BOX, PAINTING } from "./Pour";

// The home page's painting: poured as the page opens, stroke by stroke, and
// then left alone. Nothing in it moves once it has landed; only, every so
// often, a little more paint runs or lands (see Pour). So it is only drawn
// while something is being poured, and only what is new: paint already down
// stays on the canvas. With motion reduced, it is there finished

// The thinnest a touch of paint is drawn, in screen pixels, however small
// the painting is shown
const FINEST = 0.45;

export default function Painting() {
  const wall = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const room = wall.current;
    const element = canvas.current;
    if (!room || !element) return;
    const context = element.getContext("2d")!;
    // The paint, and the colour of what has soaked a little way into the page
    // around it
    const ink = readTokens().foreground;
    const soak = `rgb(${rgbChannels(ink).join(" ")} / 0.45)`;
    // How many of each stroke's touches are down
    const down = PAINTING.map(() => 0);
    let time = reducedMotion ? Infinity : 0;
    let finest = FINEST;

    // Lays down whatever has landed by now and is not yet on the canvas.
    // Returns whether anything is still being poured
    const pour = () => {
      let pouring = false;
      PAINTING.forEach(({ touches, start, duration, fall }, s) => {
        const count = touches.length / 3;
        if (down[s] === count || time < start) return;
        const t = Math.min(1, (time - start) / duration);
        const landed = Math.floor(count * (fall ? 1 - (1 - t) ** 2 : t));
        context.beginPath();
        for (let i = down[s] * 3; i < landed * 3; i += 3) {
          const radius = Math.max(touches[i + 2], finest);
          context.moveTo(touches[i] + radius, touches[i + 1]);
          context.arc(touches[i], touches[i + 1], radius, 0, Math.PI * 2);
        }
        context.fill();
        down[s] = landed;
        if (landed < count) pouring = true;
      });
      return pouring;
    };

    // The painting keeps its proportions: as large as fits its part of the
    // window, against the right edge, half way up
    const fit = () => {
      const { clientWidth: width, clientHeight: height } = room;
      if (!width || !height) return;
      const pixels = Math.min(2, Math.max(1, window.devicePixelRatio));
      const scale = Math.min(width / BOX.width, height / BOX.height);
      element.width = Math.round(width * pixels);
      element.height = Math.round(height * pixels);
      context.setTransform(
        pixels * scale,
        0,
        0,
        pixels * scale,
        pixels * (width - BOX.width * scale),
        (pixels * (height - BOX.height * scale)) / 2,
      );
      // (Not scaled with the rest: in the canvas's own pixels)
      context.shadowBlur = 1.2 * pixels;
      context.shadowColor = soak;
      context.fillStyle = ink;
      finest = FINEST / scale;
      // A canvas resized is a canvas cleared: everything down goes down again
      down.fill(0);
      pour();
    };
    const observer = new ResizeObserver(fit);
    observer.observe(room);
    if (reducedMotion) return () => observer.disconnect();

    let frame = 0;
    let timer = 0;
    let last = 0;
    const loop = (now: number) => {
      time += last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      if (pour()) {
        frame = requestAnimationFrame(loop);
        return;
      }
      // Nothing to draw until the next paint lands, if any is still to
      const next = Math.min(...PAINTING.filter((_, s) => !down[s]).map(({ start }) => start));
      if (next === Infinity) return;
      timer = window.setTimeout(
        () => {
          time = next;
          last = 0;
          frame = requestAnimationFrame(loop);
        },
        (next - time) * 1000,
      );
    };
    // Away from the tab, it stops where it is, and picks up from there
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  return (
    // Above the words on phones; beside them, down the right of the window,
    // on anything wider
    <div
      ref={wall}
      aria-hidden
      className="painting pointer-events-none relative h-[44svh] shrink-0 sm:fixed sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[58%]"
    >
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </div>
  );
}
