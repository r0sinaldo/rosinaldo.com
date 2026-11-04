"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { drawBall } from "./Ball";
import { IDEAS } from "./Ideas";
import { CRUMPLE, drawIdea, drawSheet, SHEET, stripWidth } from "./Paper";
import { pattern } from "./Patterns";
import { drawScissors, type Scissors } from "./Scissors";
import { flick, snip } from "./Sound";
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

type State = "idle" | "crumpling" | "running" | "over";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score: number) {
  try {
    localStorage.setItem(BEST, String(score));
  } catch {}
}

export default function PaperRun() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  // Whether the ball has just been cut, for the way to the Lab
  const [snipped, setSnipped] = useState(false);
  // Off until asked for, on every visit
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const muted = useRef(true);

  useEffect(() => {
    muted.current = !sound;
  }, [sound]);

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    // Made here, in the click, as browsers only let sound start from one
    if (on) {
      audio.current ??= new AudioContext();
      audio.current.resume();
    }
  };

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d")!;
    let colours = palette();
    let width = 0;

    const game = {
      state: "idle" as State,
      time: 0,
      // When the page started crumpling
      crumpled: 0,
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

    // Sounds only when they are on, and not before
    const play = (sound: (audio: AudioContext) => void) => {
      if (muted.current) return;
      audio.current ??= new AudioContext();
      audio.current.resume();
      sound(audio.current);
    };

    // A new page, crumpled up, then off it goes
    const start = () => {
      setSnipped(false);
      Object.assign(game, {
        state: "crumpling",
        crumpled: game.time,
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
    };

    const jump = () => {
      if (game.state === "crumpling") return;
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
      if (game.state === "crumpling" && game.time - game.crumpled >= CRUMPLE) game.state = "running";
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
      if (!width) return;
      context.clearRect(0, 0, width, HEIGHT);
      context.strokeStyle = colours.line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, GROUND + 0.5);
      context.lineTo(width, GROUND + 0.5);
      context.stroke();

      for (const s of game.scissors) {
        // Slowly, and only part way: quick snipping strobes as it passes
        const open = s.snips ? 0.5 + 0.25 * Math.sin(game.time * 3.2 + s.phase) : 0.45;
        drawScissors(context, s, game.state === "over" ? 0 : open, colours);
      }

      // The ball's shadow, smaller the higher it is
      context.fillStyle = colours.line;
      context.globalAlpha = 0.9;
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
      } else drawPage();

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
        context.fillText(message, width / 2, 30 / SCALE);
        context.globalAlpha = 1;
      }
    }

    // The page, swaying a little while it waits, then crumpling, the ball
    // taking over as the last folds go in
    function drawPage() {
      const t = game.state === "idle" ? 0 : Math.min((game.time - game.crumpled) / CRUMPLE, 1);
      const e = easeInOut(t);
      context.save();
      context.translate(BALL.x, GROUND - SHEET.height / 2 - 1 + (SHEET.height / 2 + 1 - BALL.radius) * e);
      context.rotate((1 - e) * (0.08 + Math.sin(game.time * 1.4) * 0.03));
      drawSheet(context, t, colours);
      if (t > 0.7) {
        context.globalAlpha = (t - 0.7) / 0.3;
        drawBall(context, 0, colours);
        context.globalAlpha = 1;
      }
      context.restore();
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

    const resize = () => {
      const scale = Math.max(1, Math.round(window.devicePixelRatio));
      width = element.clientWidth / SCALE;
      element.width = Math.round(element.clientWidth * scale);
      element.height = Math.round(HEIGHT * SCALE * scale);
      context.setTransform(scale * SCALE, 0, 0, scale * SCALE, 0, 0);
      // Without motion, only a still of it: the page and a pair of scissors
      if (reducedMotion) game.scissors = [{ x: width * 0.6, height: 24, snips: false, phase: 0 }];
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
    // strip; to start, or start again, it has to be on the game itself
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isControl(event.target)) return;
      if (game.state !== "running" && !element.contains(event.target as Node)) return;
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
    if (reducedMotion) {
      return () => {
        observer.disconnect();
        scheme.removeEventListener("change", onScheme);
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
    };
  }, [reducedMotion]);

  return (
    <div className="relative">
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
        style={{ top: GROUND * SCALE + 9, opacity: snipped ? 1 : 0, transitionDelay: snipped ? "800ms" : "0ms" }}
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
