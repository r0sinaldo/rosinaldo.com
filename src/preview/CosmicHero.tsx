/* eslint-disable @next/next/no-img-element -- the layers have to sit at exact
   fractions of one stage, and the intro waits until every one has decoded */
"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  type Ambient,
  drawAmbient,
  drawGround,
  GROUND,
  makeAmbient,
  makeGround,
  ROCKET_PIVOT,
  rockMotion,
  rocketMotion,
} from "./Ambient";
import { LOOK_AWAY } from "./astronaut/Rigged";
import { ASTRONAUT_BOX, createAstronaut } from "./astronaut/Scene";
import { type Box, CHART, CHART_PATH, CHART_STEP, IMAGE, ROCKET, ROCKS, SQUARE_GRID, SQUARES } from "./Layout";

// When each part of the intro happens, in seconds, on one clock. The squares
// come in first; the chart draws itself slowly across the sky; the astronaut
// turns to it as it starts, and gets up (from 3.6s to 8.9s, see
// astronaut/Rigged) with his eyes on its leading edge; the last candles
// arrive as he settles. His last turn of the head settles by thirteen and a half; after that only
// the space around him keeps moving
const INTRO = {
  squares: [0.2, 4.2],
  chart: [1.8, 10.0],
  end: 13.4,
} as const;

// The chart drawn so far (0 to 1) at `t`: a long, even ease, so it gets going
// gently and arrives gently
const chartAt = (t: number) => {
  const s = clamp((t - INTRO.chart[0]) / (INTRO.chart[1] - INTRO.chart[0]));
  return 0.5 - 0.5 * Math.cos(Math.PI * s);
};
// Where his eyes are at `t`, in the picture's pixels. A small story: sitting,
// he looks up at the sky; something catches his eye low on the horizon, and
// his head comes down to where the chart begins; he follows its leading edge
// as it climbs, and as he gets up; then, the chart drawn, he looks away to
// the left, out into open space, where a star is about to fall. One look
// eases into the next, and his neck (see astronaut/Rigged) smooths it again
const SKY = { x: 1040, y: 800 };
const CHART_START = { x: CHART.left + 20, y: 930 };
// Out into space, up along the path the falling star takes: off to his side
// rather than back where the chart is, so his head comes round into profile,
// a thoughtful look up at it
const UNIVERSE = { x: 1150, y: 360, depth: -0.2 };
const LOOKS = { notice: [1.4, 2.6], follow: [2.6, 3.4], away: LOOK_AWAY } as const;
const GAZE_LAG = 0.35;
const GAZE_LIMIT = 1860;
const smoothstep = (t: number, [a, b]: readonly [number, number]) => {
  const s = clamp((t - a) / (b - a));
  return s * s * s * (s * (s * 6 - 15) + 10);
};
type Look = { x: number; y: number; depth?: number };
const CHART_PLANE = 1.0;
const mix = (p: Look, q: Look, w: number): Look => ({
  x: p.x + (q.x - p.x) * w,
  y: p.y + (q.y - p.y) * w,
  depth: (p.depth ?? CHART_PLANE) + ((q.depth ?? CHART_PLANE) - (p.depth ?? CHART_PLANE)) * w,
});
// The chart's leading edge, a beat behind it as eyes follow something
// moving. It ends behind him, past where a head can turn, so as it nears
// him the point eases to a stop on its upper part, short of his shoulder
function chartFront(t: number) {
  const front = CHART.left + chartAt(t - GAZE_LAG) * CHART.width;
  // A soft minimum, so the stop is never sudden
  const k = 60;
  const x = -k * Math.log(Math.exp(-front / k) + Math.exp(-GAZE_LIMIT / k));
  const i = Math.min(CHART_PATH.length - 1, Math.max(0, (x - CHART.left) / CHART_STEP));
  const lo = CHART_PATH[Math.floor(i)];
  const hi = CHART_PATH[Math.min(CHART_PATH.length - 1, Math.ceil(i))];
  // A little above the line, where the candles' bodies are
  return { x, y: lo + (hi - lo) * (i - Math.floor(i)) - 40 };
}
function gazeAt(t: number) {
  let at = mix(SKY, CHART_START, smoothstep(t, LOOKS.notice));
  at = mix(at, chartFront(t), smoothstep(t, LOOKS.follow));
  // Going out into space the look carries a little past where it lands and
  // settles back, as a turn of the head does
  const p = clamp((t - LOOKS.away[0]) / (LOOKS.away[1] - LOOKS.away[0]));
  const settle = 0.07 * Math.sin(Math.PI * clamp((p - 0.45) / 0.55)) ** 2;
  return mix(at, UNIVERSE, smoothstep(t, LOOKS.away) + settle);
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const place = (b: Box): CSSProperties => ({
  left: pct(b.left, IMAGE.width),
  top: pct(b.top, IMAGE.height),
  width: pct(b.width, IMAGE.width),
  height: pct(b.height, IMAGE.height),
});
// How far the chart's reveal runs past its box, so the soft edge clears it
const OVERRUN = 0.035;

// The squares come in one by one, softly, in a loose order from the top
// left: each cell's own start within the squares' span, and how long it takes
const CELL_FADE = 0.4;
function cellStarts() {
  const columns = Math.ceil((SQUARES.width - SQUARE_GRID.x) / SQUARE_GRID.width);
  const rows = Math.ceil((SQUARES.height - SQUARE_GRID.y) / SQUARE_GRID.height) + 1;
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cells: { x: number; y: number; start: number }[] = [];
  for (let row = -1; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const order = (row / rows) * 0.55 + (column / columns) * 0.2 + random() * 0.25;
      cells.push({
        x: SQUARE_GRID.x + column * SQUARE_GRID.width,
        y: SQUARE_GRID.y + row * SQUARE_GRID.height,
        start: order * (1 - CELL_FADE),
      });
    }
  }
  return cells;
}

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
  const ground = useRef<HTMLCanvasElement>(null);
  const squares = useRef<HTMLCanvasElement>(null);
  const rocket = useRef<HTMLImageElement>(null);
  const rocks = useRef<(HTMLImageElement | null)[]>([]);
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
    const groundContext = ground.current!.getContext("2d")!;
    const dust = makeGround();
    // How much his boots move the dust: while he pushes up off the ground
    // (the push off the ground in his getting up)
    const stir = (t: number) => Math.max(0, Math.min(1, (t - 4.0) / 0.7, (6.8 - t) / 1.5));
    let start = 0;
    let last = 0;
    let frame = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // The squares, drawn cell by cell while they come in
    const squaresImage = root.querySelector<HTMLImageElement>("img[data-squares]")!;
    const squaresContext = squares.current!.getContext("2d")!;
    const cells = cellStarts();
    let squaresDone = -1;
    const drawSquares = (p: number) => {
      if (squaresDone === p) return;
      squaresDone = p;
      const c = squaresContext;
      const { width, height } = c.canvas;
      const k = width / SQUARES.width;
      c.clearRect(0, 0, width, height);
      if (p >= 1) {
        c.drawImage(squaresImage, 0, 0, width, height);
        return;
      }
      // A faint whole first, so the grid never pops, then each cell
      c.globalAlpha = 0.35 * easeInOut(clamp(p / 0.6));
      c.drawImage(squaresImage, 0, 0, width, height);
      for (const cell of cells) {
        const a = easeInOut(clamp((p - cell.start) / CELL_FADE));
        if (a <= 0) continue;
        c.globalAlpha = a;
        const x = Math.max(0, cell.x);
        const y = Math.max(0, cell.y);
        const w = Math.min(SQUARES.width, cell.x + SQUARE_GRID.width) - x;
        const h = Math.min(SQUARES.height, cell.y + SQUARE_GRID.height) - y;
        if (w <= 0 || h <= 0) continue;
        c.drawImage(squaresImage, x, y, w, h, x * k, y * k, w * k, h * k);
      }
      c.globalAlpha = 1;
    };

    // The rocket and the rocks, floating
    let stageScale = 1;
    const drift = (t: number) => {
      const k = stageScale;
      const m = rocketMotion(t);
      rocket.current!.style.transform = `translate(${m.x * k}px, ${m.y * k}px) rotate(${m.angle}rad)`;
      ROCKS.forEach((rock, i) => {
        const el = rocks.current[i];
        if (!el) return;
        const r = rockMotion(i, t);
        const px = r.x * rock.depth - pointer.x * 5 * rock.depth;
        const py = r.y * rock.depth - pointer.y * 3 * rock.depth;
        el.style.transform = `translate(${px * k}px, ${py * k}px) rotate(${r.angle * rock.depth}rad)`;
      });
    };

    // The intro's state at `t` seconds
    const intro = (t: number) => {
      drawSquares(clamp((t - INTRO.squares[0]) / (INTRO.squares[1] - INTRO.squares[0])));
      const chart = chartAt(t);
      root.style.setProperty("--chart", String(chart));
    };

    // One frame of everything at `t` seconds. Past the intro the chart and
    // the squares stay as they are, so they aren't redrawn; the astronaut
    // goes on standing there, breathing (see astronaut/Rigged), unless the
    // visitor prefers things still
    let introDrawn = false;
    const draw = (t: number, dt: number) => {
      if (t <= INTRO.end || !introDrawn) {
        intro(Math.min(t, INTRO.end));
        introDrawn = t > INTRO.end;
      }
      if (t <= INTRO.end || !still) astronaut.render(t, gazeAt(Math.min(t, INTRO.end)));
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2);
      drawAmbient(context, ambient, t, dt, pointer, still);
      drawGround(groundContext, dust, ambient.sprites, t, dt, still ? 0 : stir(t), pointer, still);
      drift(still ? 0 : t);
    };

    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      // Sharp, but never more than about four million pixels to clear each frame
      const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(4e6 / Math.max(1, width * height)));
      canvas.current!.width = Math.round(width * scale);
      canvas.current!.height = Math.round(height * scale);
      const groundScale = Math.min(window.devicePixelRatio || 1, 2) * (width / IMAGE.width);
      ground.current!.width = Math.round(GROUND.width * groundScale);
      ground.current!.height = Math.round(GROUND.height * groundScale);
      stageScale = width / IMAGE.width;
      const pixels = Math.min(window.devicePixelRatio || 1, 2);
      squares.current!.width = Math.round((SQUARES.width / IMAGE.width) * width * pixels);
      squares.current!.height = Math.round((SQUARES.height / IMAGE.height) * height * pixels);
      squaresDone = -1;
      const box = figure.current!.getBoundingClientRect();
      // The astronaut at the screen's full sharpness, and where he is small
      // (on phones) drawn larger than shown and scaled down, so his edges and
      // the suit's details stay crisp; never more than about 2.5 million
      // pixels, so it stays light
      const dpr = window.devicePixelRatio || 1;
      const sharp = Math.max(dpr, Math.min(4, 1100 / Math.max(1, box.width)));
      const budget = Math.sqrt(2.5e6 / Math.max(1, box.width * box.height));
      astronaut.resize(box.width, box.height, Math.min(sharp, budget));
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
      // The falling star he turns to watch comes again too
      ambient.shot = null;
      ambient.nextShot = 11.5;
      ambient.firstShot = true;
    };

    // Nothing moves until every layer is ready, so the intro is never seen
    // half loaded
    const layers = [...root.querySelectorAll("img")];
    let cancelled = false;
    const loaded = Promise.all([...layers.map((img) => img.decode().catch(() => {})), astronaut.ready]).then(() => {
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
        style={{ "--chart": 0 } as CSSProperties}
      >
        <img src="/cosmic/base.webp" alt="" className="absolute inset-0 size-full" draggable={false} />
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {ROCKS.map((rock, i) => (
          <img
            key={rock.src}
            ref={(el) => {
              rocks.current[i] = el;
            }}
            src={rock.src}
            alt=""
            className="absolute will-change-transform"
            style={place(rock)}
            draggable={false}
          />
        ))}
        <img
          ref={rocket}
          src="/cosmic/rocket.webp"
          alt=""
          className="absolute will-change-transform"
          style={{ ...place(ROCKET), transformOrigin: `${ROCKET_PIVOT.x * 100}% ${ROCKET_PIVOT.y * 100}%` }}
          draggable={false}
        />
        <img data-squares src="/cosmic/squares.webp" alt="" className="hidden" draggable={false} />
        <canvas ref={squares} aria-hidden className="absolute" style={place(SQUARES)} />
        <img
          src="/cosmic/chart.webp"
          alt=""
          className="absolute"
          style={{ ...place(CHART), ...reveal("90deg", "--chart", OVERRUN) }}
          draggable={false}
        />
        <canvas ref={figure} aria-hidden className="absolute" style={place(ASTRONAUT_BOX)} />
        {/* The glowing dust on the rock he stands on, partly in front of him */}
        <canvas ref={ground} aria-hidden className="pointer-events-none absolute" style={place(GROUND)} />
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
