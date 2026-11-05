/* eslint-disable @next/next/no-img-element -- the layers have to sit at exact
   fractions of one stage, and the intro waits until every one has decoded */
"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { type Ambient, drawAmbient, makeAmbient } from "./Ambient";
import { ASTRONAUT_BOX, createAstronaut } from "./astronaut/Scene";
import { type Box, CHART, CHART_PATH, CHART_STEP, IMAGE, SQUARES } from "./Layout";

// When each part of the intro happens, in seconds. The astronaut keeps his
// own timing (see astronaut/Pose): the head turns from 0.6s, he stands from
// 3s and is still by 9. All of it is over before ten; after that only the
// space around him keeps moving
const INTRO = {
  squares: [0.3, 3.3],
  chart: [1.6, 8.4],
  end: 9.6,
} as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const span = (t: number, [a, b]: readonly [number, number]) => easeInOut(clamp((t - a) / (b - a)));
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const place = (b: Box): CSSProperties => ({
  left: pct(b.left, IMAGE.width),
  top: pct(b.top, IMAGE.height),
  width: pct(b.width, IMAGE.width),
  height: pct(b.height, IMAGE.height),
});
// How far the chart's reveal runs past its box, so the soft edge clears it
const OVERRUN = 0.08;

// For recording: ?capture leaves the clock to whoever drives the page, frame
// by frame, through window.__cosmic
type Capture = { ready: Promise<void>; frame: (t: number, dt: number) => void };
declare global {
  interface Window {
    __cosmic?: Capture;
  }
}

export default function CosmicHero() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const figure = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const replay = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = stage.current!;
    const context = canvas.current!.getContext("2d")!;
    const capture = new URLSearchParams(window.location.search).has("capture");
    const still = !capture && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const astronaut = createAstronaut(figure.current!, { capture });
    const ambient: Ambient = makeAmbient();
    let start = 0;
    let last = 0;
    let frame = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // The intro's state at `t` seconds
    const intro = (t: number) => {
      root.style.setProperty("--squares", String(span(t, INTRO.squares)));
      // A gentler curve than the rest, so the drawing gets going straight away
      const chart = 0.5 - 0.5 * Math.cos(Math.PI * clamp((t - INTRO.chart[0]) / (INTRO.chart[1] - INTRO.chart[0])));
      root.style.setProperty("--chart", String(chart));
      // The light at the front of the drawing, on the chart's line
      const front = clamp(chart * (1 + OVERRUN) - OVERRUN / 2);
      const x = CHART.left + front * CHART.width;
      const i = Math.min(CHART_PATH.length - 1, (front * CHART.width) / CHART_STEP);
      const lo = CHART_PATH[Math.floor(i)];
      const hi = CHART_PATH[Math.min(CHART_PATH.length - 1, Math.ceil(i))];
      const y = lo + (hi - lo) * (i - Math.floor(i));
      const g = glow.current!;
      g.style.left = pct(x, IMAGE.width);
      g.style.top = pct(y, IMAGE.height);
      g.style.opacity = String(clamp((t - INTRO.chart[0]) / 0.6) * (1 - clamp((t - (INTRO.chart[1] - 0.3)) / 1.0)));
    };

    // One frame of everything at `t` seconds; past the intro only the
    // ambient space changes, so the rest isn't redrawn
    let introDrawn = false;
    const draw = (t: number, dt: number) => {
      if (t <= INTRO.end || !introDrawn) {
        intro(Math.min(t, INTRO.end));
        astronaut.render(Math.min(t, INTRO.end));
        introDrawn = t > INTRO.end;
      }
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2);
      drawAmbient(context, ambient, t, dt, pointer, still);
    };

    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      // Sharp, but never more than about four million pixels to clear each frame
      const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(4e6 / Math.max(1, width * height)));
      canvas.current!.width = Math.round(width * scale);
      canvas.current!.height = Math.round(height * scale);
      const box = figure.current!.getBoundingClientRect();
      astronaut.resize(box.width, box.height, Math.min(window.devicePixelRatio || 1, 2));
      introDrawn = false;
      if (still) draw(INTRO.end + 1, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const tick = (now: number) => {
      draw((now - start) / 1000, Math.min(0.05, (now - last) / 1000));
      last = now;
      frame = requestAnimationFrame(tick);
    };

    replay.current = () => {
      start = last = performance.now();
      introDrawn = false;
    };

    // Nothing moves until every layer is ready, so the intro is never seen
    // half loaded
    const layers = [...root.querySelectorAll("img")];
    let cancelled = false;
    const loaded = Promise.all(layers.map((img) => img.decode().catch(() => {}))).then(() => {
      if (cancelled) return;
      resize();
      if (capture) {
        draw(0, 0);
      } else if (still) {
        draw(INTRO.end + 1, 0);
      } else {
        draw(0, 0);
        start = last = performance.now();
        frame = requestAnimationFrame(tick);
      }
      setReady(true);
    });
    if (capture) {
      root.parentElement!.dataset.capture = "";
      window.__cosmic = { ready: loaded, frame: draw };
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      astronaut.dispose();
      delete window.__cosmic;
    };
  }, []);

  const reveal = (direction: string, variable: string, overrun: number): CSSProperties => {
    const mask = `linear-gradient(${direction}, #000 calc(var(${variable}) * ${100 + overrun * 100}% - ${overrun * 100}%), transparent calc(var(${variable}) * ${100 + overrun * 100}%))`;
    return { maskImage: mask, WebkitMaskImage: mask };
  };

  return (
    <section
      aria-label="An astronaut on a rocky ledge above a glowing planet stands up to watch a rising candlestick chart drawn across the stars"
      className="group relative h-svh w-full overflow-hidden bg-[#020713]"
    >
      {/* The picture's own proportions, covering the screen on wide ones
          (kept to the right, where the astronaut is), and on tall ones
          showing the chart and the astronaut across the full width */}
      <div
        ref={stage}
        className={`absolute top-1/2 aspect-[2592/1454] -translate-y-1/2 portrait:left-[-62vw] portrait:w-[162vw] landscape:left-[calc((100vw-max(100vw,100svh*2592/1454))*0.85)] landscape:w-[max(100vw,100svh*2592/1454)] ${
          ready ? "opacity-100" : "opacity-0"
        } transition-opacity duration-700`}
        style={{ "--squares": 0, "--chart": 0 } as CSSProperties}
      >
        <img src="/cosmic/base.webp" alt="" className="absolute inset-0 size-full" draggable={false} />
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        <img
          src="/cosmic/squares.webp"
          alt=""
          className="absolute"
          style={{ ...place(SQUARES), ...reveal("180deg", "--squares", 0.25) }}
          draggable={false}
        />
        <img
          src="/cosmic/chart.webp"
          alt=""
          className="absolute"
          style={{ ...place(CHART), ...reveal("90deg", "--chart", OVERRUN) }}
          draggable={false}
        />
        {/* The light that draws the chart, running along its front */}
        <div
          ref={glow}
          aria-hidden
          className="pointer-events-none absolute aspect-square w-[7%] -translate-1/2 rounded-full opacity-0 mix-blend-screen"
          style={{
            background:
              "radial-gradient(closest-side, rgba(200,255,225,0.75), rgba(90,230,170,0.28) 35%, rgba(80,140,255,0.1) 65%, transparent)",
          }}
        />
        {/* Softened a touch, to sit in the painting rather than on it */}
        <canvas ref={figure} aria-hidden className="absolute blur-[0.4px]" style={place(ASTRONAUT_BOX)} />
      </div>

      {/* On tall screens the picture is a band: it fades into the page above and below */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(#020713_calc(50%-45.5vw),transparent_calc(50%-34vw),transparent_calc(50%+34vw),#020713_calc(50%+45.5vw))] portrait:block"
      />

      {!reduced && (
        <button
          type="button"
          onClick={() => replay.current()}
          className={`absolute bottom-5 left-5 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md transition-[color,background-color,opacity] duration-200 group-data-capture:hidden hover:bg-white/14 hover:text-white focus-visible:outline-2 focus-visible:outline-white/60 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5v2.5h2.5" />
          </svg>
          Replay intro
        </button>
      )}
    </section>
  );
}
