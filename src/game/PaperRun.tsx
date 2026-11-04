"use client";

import Link from "next/link";
import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { drawBall } from "./Ball";
import { type Fall, fallAt, planFall } from "./Fall";
import { IDEAS } from "./Ideas";
import { drawIdea, drawSheet, stripWidth } from "./Paper";
import { pattern } from "./Patterns";
import { drawScissors, type Scissors } from "./Scissors";
import { crumple, flick, land, snip } from "./Sound";
import { BALL, easeInOut, GRAVITY, GROUND, HEIGHT, JUMP, NEXT_JUMP, palette, random, SCALE } from "./World";

// A small game along the bottom of the home page. The ball is an idea I had
// and threw away: a page that crumples up as the run starts, rolls along
// regardless, jumping the scissors in its way, and, when one gets it, lets
// the idea written on it slip out

// The run gets harder over its first 40 seconds, quickly at first, and the
// speed creeps up a little after that. It stays within what the eye can
// follow: past it, thin shapes smear and the game gets harder to look at,
// not to play, so beyond that it is the arrangements that get harder
const RAMP = 40;
const SPEED = { start: 300, full: 600, after: 2, most: 680 };
// The most the ball is seen to spin (rad/s): any faster and its folds flicker
const SPIN = 16;
const BEST = "paper-run-best";
// Where the line to the Lab sits after a run: centred in the space between the
// line the game runs on and the bottom of the page (the strip's last 31px and
// the 24px of page under it), less half its own 16px height
const FOOTER = GROUND * SCALE + (HEIGHT * SCALE - GROUND * SCALE + 24) / 2 - 8;

// The canvas the page waits in, around the place marked for it (px): room
// for the page as it sways
const WAITING = 48;
// How much of the fall the page takes to crumple into the ball, and how fast it
// turns over as it falls (rad/s)
const CRUMPLED_AT = 0.6;
const TUMBLE = 5;

type State = "idle" | "falling" | "running" | "over";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST)) || 0;
  } catch {
    return 0;
  }
}

// Browsers only let sound start from a key or a tap, so the audio is made, or
// woken, in one: the tap that turns sound on, or the key or tap that starts a run
function wake(audio: RefObject<AudioContext | null>) {
  audio.current ??= new AudioContext();
  audio.current.resume();
  return audio.current;
}

function saveBest(score: number) {
  try {
    localStorage.setItem(BEST, String(score));
  } catch {}
}

export default function PaperRun() {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The place marked for the page on the home page ([data-paper], above the
  // name). The page waits there, drawn inside it so it moves with the page
  // whatever the page does (an iPhone's bounce at the top included), and falls
  // from there
  const place = useSyncExternalStore(
    () => () => {},
    () => document.querySelector<HTMLElement>("[data-paper]"),
    () => null,
  );
  const waitingCanvas = useRef<HTMLCanvasElement>(null);
  // Over the whole window, for the fall. Put in the body, as fixed inside the
  // game it would be fixed to the game: the game's entrance leaves a transform
  // on what holds it
  const sky = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  // Whether the ball has just been cut, for the way to the Lab
  const [snipped, setSnipped] = useState(false);
  // On to start with, on every visit
  const [sound, setSound] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const muted = useRef(false);

  useEffect(() => {
    muted.current = !sound;
  }, [sound]);

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    if (on) wake(audio);
  };

  useEffect(() => {
    const element = canvas.current;
    const overlay = sky.current;
    const sheet = waitingCanvas.current;
    if (!element || !overlay || !sheet || !place) return;
    const context = element.getContext("2d")!;
    const above = overlay.getContext("2d")!;
    const waiting = sheet.getContext("2d")!;
    let colours = palette();
    let width = 0;

    const game = {
      state: "idle" as State,
      time: 0,
      // The page's fall onto the line, and when it began
      fall: null as Fall | null,
      fell: 0,
      // The ball: how high it is (negative, up), how fast it is rising or
      // falling, its squash on landing and how far it has turned
      y: 0,
      velocity: 0,
      grounded: true,
      squash: 0,
      roll: 0,
      speed: SPEED.start,
      distance: 0,
      // Seconds into the run, which sets how hard it is
      run: 0,
      // How far until the next arrangement of scissors comes along
      next: 0,
      scissors: [] as Scissors[],
      best: readBest(),
      // Where and when the scissors got the ball
      cut: { time: 0, x: 0, y: 0 },
      // Which idea comes out next: a different one each time, from anywhere
      // in the list to start with
      idea: Math.floor(Math.random() * IDEAS.length),
    };

    const score = () => Math.floor((game.distance * SCALE) / 12);

    // Sounds only when they are on
    const play = (sound: (audio: AudioContext) => void) => {
      if (!muted.current) sound(wake(audio));
    };

    // Where the page falls from and where the ball runs from, in the window's
    // pixels, as the fall is drawn
    const home = () => {
      const { left, top, width, height } = place.getBoundingClientRect();
      return { x: left + width / 2, y: top + height / 2 };
    };
    const landing = () => {
      const strip = element.getBoundingClientRect();
      return { x: strip.left + BALL.x * SCALE, y: strip.top + (GROUND - BALL.radius) * SCALE };
    };

    // A new page falls from above the name, crumpling into the ball as it goes,
    // and the run starts as it lands
    const start = () => {
      setSnipped(false);
      const fall = planFall(home(), landing());
      Object.assign(game, {
        state: "falling",
        fall,
        fell: game.time,
        y: 0,
        velocity: 0,
        grounded: true,
        roll: 0,
        speed: SPEED.start,
        distance: 0,
        run: 0,
        next: width * 0.7,
        scissors: [],
      });
      play((audio) => crumple(audio, fall.duration * CRUMPLED_AT));
    };

    const jump = () => {
      if (game.state === "falling") return;
      if (game.state !== "running") return start();
      if (!game.grounded) return;
      game.velocity = JUMP;
      game.grounded = false;
      play(flick);
    };

    const cut = (x: number, y: number) => {
      game.state = "over";
      game.cut = { time: game.time, x, y };
      game.idea = (game.idea + 1) % IDEAS.length;
      play(snip);
      setSnipped(true);
      if (score() > game.best) {
        game.best = score();
        saveBest(game.best);
      }
    };

    function step(dt: number) {
      game.time += dt;
      if (game.state === "falling" && game.fall && game.time - game.fell >= game.fall.duration) {
        game.state = "running";
        // Landing with a squash
        game.squash = 0.8;
        play(land);
      }
      if (game.state !== "running") return;
      game.run += dt;
      const level = Math.min(1, game.run / RAMP);
      game.speed = Math.min(
        SPEED.most,
        SPEED.start + (SPEED.full - SPEED.start) * level ** 0.8 + Math.max(0, game.run - RAMP) * SPEED.after,
      );
      // The pace in the game's own units
      const pace = game.speed / SCALE;
      const moved = pace * dt;
      game.distance += moved;
      game.roll += Math.min(moved / BALL.radius, SPIN * dt);

      if (!game.grounded) {
        game.velocity += GRAVITY * dt;
        game.y += game.velocity * dt;
        if (game.y >= 0) {
          game.y = 0;
          game.grounded = true;
          // A little squash as it lands
          game.squash = Math.min(1, game.velocity / 900);
          game.velocity = 0;
        }
      }
      game.squash = Math.max(0, game.squash - dt * 6);

      for (const s of game.scissors) s.x -= moved;
      game.scissors = game.scissors.filter((s) => s.x > -30);
      game.next -= moved;
      if (game.next <= 0) {
        const placed = pattern(level);
        for (const { at, offset = 0, height, flying } of placed) {
          game.scissors.push({
            x: width + 20 + at * pace + offset,
            height,
            flying,
            snips: flying !== undefined || Math.random() < 0.3 + 0.5 * level,
            phase: random(0, 6),
          });
        }
        // Then a breather, shorter as it goes on, never shorter than a
        // landing and a jump
        const length = Math.max(...placed.map(({ at }) => at));
        const gap = Math.max(NEXT_JUMP, random(1 - 0.35 * level, 1.5 - 0.65 * level));
        game.next = (length + gap) * pace + Math.max(...placed.map(({ offset = 0 }) => offset));
      }

      // Caught: the ball's centre comes within the blades' reach
      const centre = { x: BALL.x, y: GROUND - BALL.radius + game.y };
      const caught = game.scissors.some((s) =>
        s.flying === undefined
          ? Math.abs(centre.x - s.x) < BALL.radius * 0.6 + s.height * 0.2 &&
            centre.y + BALL.radius * 0.7 > GROUND - s.height + 4
          : Math.abs(centre.x - s.x) < s.height * 0.45 + BALL.radius * 0.5 &&
            Math.abs(centre.y - s.flying) < BALL.radius * 0.75 + 5,
      );
      if (caught) cut(centre.x, centre.y);
    }

    function draw() {
      drawAbove();
      if (!width) return;
      context.clearRect(0, 0, width, HEIGHT);
      context.strokeStyle = colours.line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, GROUND + 0.5);
      context.lineTo(width, GROUND + 0.5);
      context.stroke();

      // Before a run, a faint still of it, going as the page falls in
      const coming = game.state === "falling" && game.fall ? (game.time - game.fell) / game.fall.duration : 0;
      const still = game.state === "idle" ? 1 : game.state === "falling" ? 1 - coming : 0;
      if (still > 0) drawPreview(still);

      for (const s of game.scissors) {
        // Slowly, and only part way: quick snipping strobes as it passes
        const open = s.snips ? 0.5 + 0.25 * Math.sin(game.time * 3.2 + s.phase) : 0.45;
        drawScissors(context, s, game.state === "over" ? 0 : open, colours);
      }

      // The ball's shadow, smaller the higher it is: lighter where the page
      // will land, and darkening as it falls in
      const landed = game.state === "running" || game.state === "over";
      context.fillStyle = colours.line;
      context.globalAlpha = 0.9 * (landed ? 1 : 0.5 + 0.5 * coming);
      context.beginPath();
      context.ellipse(BALL.x, GROUND + 1, BALL.radius * Math.max(0.35, 1 + game.y / 90), 1.6, 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;

      if (game.state === "over") drawCut();
      else if (game.state === "running") {
        context.save();
        context.translate(BALL.x, GROUND - BALL.radius * (1 - game.squash * 0.15) + game.y);
        context.scale(1 + game.squash * 0.15, 1 - game.squash * 0.15);
        drawBall(context, game.roll, colours);
        context.restore();
      }

      // Text at its usual size, whatever the scale
      context.font = `${12 / SCALE}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "right";
      context.textBaseline = "top";
      context.fillStyle = colours.faint;
      const pad = (n: number) => String(n).padStart(5, "0");
      context.fillText(`HI ${pad(game.best)}   ${pad(score())}`, width, 8 / SCALE);

      // After a run, the strip and two quiet lines say what happened (see
      // below)
      const message = game.state === "idle" ? "Press space or tap to play" : "";
      if (message) {
        context.font = `${13 / SCALE}px ${colours.font}`;
        context.textAlign = "center";
        context.fillStyle = colours.muted;
        // A slow, soft pulse, so the invitation is noticed without nagging
        context.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.cos((game.time * 2 * Math.PI) / 1.8));
        // Centred in the space between the scores and the still of a run
        context.fillText(message, width / 2, 49 / SCALE);
        context.globalAlpha = 1;
      }
    }

    // Where the page will land, outlined, and a pair of scissors ahead of it:
    // what the game is, before it starts
    function drawPreview(alpha: number) {
      context.save();
      context.globalAlpha = alpha * 0.4;
      drawScissors(context, { x: width * 0.6, height: 24, snips: false, phase: 0 }, 0.45, colours);
      context.globalAlpha = alpha * 0.8;
      context.strokeStyle = colours.faint;
      context.lineWidth = 0.75;
      context.setLineDash([1.5, 2.5]);
      context.beginPath();
      context.arc(BALL.x, GROUND - BALL.radius, BALL.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    // Above the game: the page waiting above the name, swaying a little (and
    // back there, fading in, a while after a run ends); or, over the whole
    // window, the page falling, crumpling into the ball as it goes
    function drawAbove() {
      const dpr = Math.max(1, Math.round(window.devicePixelRatio));
      const sway = 0.08 + Math.sin(game.time * 1.4) * 0.03;
      const page = (
        target: CanvasRenderingContext2D,
        at: { x: number; y: number },
        crumpled: number,
        turn: number,
        alpha: number,
      ) => {
        target.save();
        target.globalAlpha = alpha;
        target.translate(at.x / SCALE, at.y / SCALE);
        target.rotate(turn);
        drawSheet(target, crumpled, colours);
        // The ball taking over as the last folds go in
        if (crumpled > 0.7) {
          target.globalAlpha = (alpha * (crumpled - 0.7)) / 0.3;
          drawBall(target, 0, colours);
        }
        target.restore();
      };
      for (const target of [above, waiting]) {
        target.setTransform(1, 0, 0, 1, 0, 0);
        target.clearRect(0, 0, target.canvas.width, target.canvas.height);
        target.setTransform(dpr * SCALE, 0, 0, dpr * SCALE, 0, 0);
      }
      const centre = { x: WAITING / 2, y: WAITING / 2 };
      if (game.state === "idle") page(waiting, centre, 0, sway, 1);
      else if (game.state === "over") {
        const since = game.time - game.cut.time - 0.9;
        if (since > 0) page(waiting, centre, 0, sway, Math.min(since / 0.5, 1));
      } else if (game.state === "falling" && game.fall) {
        const t = Math.min(game.time - game.fell, game.fall.duration);
        const crumpled = Math.min(t / (game.fall.duration * CRUMPLED_AT), 1);
        const turn = (1 - easeInOut(crumpled)) * sway + t * TUMBLE * Math.sign(game.fall.across || 1);
        page(above, fallAt(game.fall, t), crumpled, turn, 1);
      }
    }

    // Cut in two: the halves part and drop, and the idea slips out
    function drawCut() {
      const since = game.time - game.cut.time;
      const t = Math.min(since, 1);
      for (const side of [-1, 1]) {
        context.save();
        context.translate(game.cut.x + side * t * 10, Math.min(game.cut.y + t * t * 40, GROUND - BALL.radius * 0.5));
        context.rotate(side * t * 0.9);
        context.beginPath();
        context.rect(side < 0 ? -BALL.radius - 2 : 0, -BALL.radius - 2, BALL.radius + 2, BALL.radius * 2 + 4);
        context.clip();
        drawBall(context, game.roll, colours);
        context.restore();
      }
      if (since < 0.12) return;
      const idea = IDEAS[game.idea];
      const room = stripWidth(context, idea, colours) + 9;
      drawIdea(
        context,
        idea,
        Math.min((since - 0.12) / 0.5, 1),
        { x: game.cut.x, y: game.cut.y - 4 },
        { x: Math.max(4, Math.min(game.cut.x - 4, width - room)), y: 57 },
        game.time,
        colours,
      );
    }

    const fitAbove = () => {
      const dpr = Math.max(1, Math.round(window.devicePixelRatio));
      above.canvas.width = Math.round(window.innerWidth * dpr);
      above.canvas.height = Math.round(window.innerHeight * dpr);
      waiting.canvas.width = waiting.canvas.height = WAITING * dpr;
      draw();
    };

    const resize = () => {
      const scale = Math.max(1, Math.round(window.devicePixelRatio));
      width = element.clientWidth / SCALE;
      element.width = Math.round(element.clientWidth * scale);
      element.height = Math.round(HEIGHT * SCALE * scale);
      context.setTransform(scale * SCALE, 0, 0, scale * SCALE, 0, 0);
      // Without motion, the game stays as it waits: the page above the name,
      // and the still of a run
      draw();
    };

    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
      last = now;
      step(dt);
      draw();
      frame = requestAnimationFrame(loop);
    };

    // Links and buttons keep their own keys and taps
    const isControl = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("a, button, input, textarea, select, [contenteditable]");
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== " " && event.key !== "ArrowUp") || isControl(event.target)) return;
      event.preventDefault();
      if (!event.repeat) jump();
    };
    // Mid-run, a tap anywhere on the page jumps, so a thumb need not find the
    // strip; to start, or start again, it has to be on the game itself or on
    // the page waiting above the name
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isControl(event.target)) return;
      const target = event.target as Node;
      const onGame = element.contains(target) || place.contains(target);
      if (game.state !== "running" && !onGame) return;
      event.preventDefault();
      jump();
    };
    // Away from the tab, it stops where it is, and picks up from there
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(loop);
    };
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      colours = palette();
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    scheme.addEventListener("change", onScheme);
    window.addEventListener("resize", fitAbove);
    fitAbove();
    if (reducedMotion) {
      return () => {
        observer.disconnect();
        scheme.removeEventListener("change", onScheme);
        window.removeEventListener("resize", fitAbove);
      };
    }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(loop);
    return () => {
      // The page stays mounted, hidden, when navigated away from, and the game
      // starts over when it comes back: so must what is shown around it
      setSnipped(false);
      cancelAnimationFrame(frame);
      observer.disconnect();
      scheme.removeEventListener("change", onScheme);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", fitAbove);
    };
  }, [reducedMotion, place]);

  return (
    <div className="relative">
      {place && (
        <>
          {createPortal(
            <canvas ref={sky} aria-hidden className="pointer-events-none fixed inset-0 z-20 size-full" />,
            document.body,
          )}
          {createPortal(
            <canvas
              ref={waitingCanvas}
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2"
              style={{ width: WAITING, height: WAITING }}
            />,
            place,
          )}
        </>
      )}
      <canvas
        ref={canvas}
        role="img"
        aria-label="A small game: a ball of paper rolling along, jumping over scissors. Press space or tap to jump."
        className="block w-full touch-none select-none"
        style={{ height: HEIGHT * SCALE, WebkitTapHighlightColor: "transparent" }}
      />
      {!reducedMotion && (
        <button
          type="button"
          aria-pressed={sound}
          onClick={toggleSound}
          className="absolute top-1 -left-1 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 font-mono text-xs text-faint transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-faint"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h2.5L9 3v10L5.5 10H3z" />
            {sound ? (
              <path d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13.5 3.5a6.5 6.5 0 0 1 0 9" />
            ) : (
              <path d="M11.5 6l3.5 4M15 6l-3.5 4" />
            )}
          </svg>
          {sound ? "Sound on" : "Sound off"}
        </button>
      )}
      {/* After a run: what the strip is, above it; and, under the line the
          game runs on, as a footer, where the ideas that did make it are.
          Taps on the words go through to the game, so they start again */}
      <p
        className="pointer-events-none absolute inset-x-0 text-center text-xs text-muted transition-opacity duration-300"
        style={{ top: 40, opacity: snipped ? 1 : 0, transitionDelay: snipped ? "500ms" : "0ms" }}
        aria-live="polite"
      >
        {snipped && "Some ideas don’t make it."}
      </p>
      <p
        className="pointer-events-none absolute inset-x-0 text-center text-xs text-faint transition-opacity duration-300"
        style={{ top: FOOTER, opacity: snipped ? 1 : 0, transitionDelay: snipped ? "800ms" : "0ms" }}
      >
        {snipped && (
          <>
            The ones that did are in the{" "}
            <Link
              href="/lab"
              className="pointer-events-auto underline decoration-[color-mix(in_srgb,currentColor_35%,transparent)] underline-offset-2 transition-colors hover:text-foreground"
            >
              Lab →
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
