import { readTokens } from "@/lib/Tokens";

// The game's world: its size, the ball's place in it, how things fall, and the
// colours it is drawn in

// Everything is laid out in the game's own units and drawn this much larger.
// Speeds are in screen pixels, so it plays at the same pace whatever the scale
export const SCALE = 1.4;
export const HEIGHT = 112;
export const GROUND = HEIGHT - 22;
export const BALL = { x: 56, radius: 10 };
export const GRAVITY = 2100;
export const JUMP = -560;
// Time in the air for a jump, and the least time between two scissors that
// each need one: enough to land and jump again
const AIRTIME = (-2 * JUMP) / GRAVITY;
export const NEXT_JUMP = AIRTIME + 0.12;

export const random = (min: number, max: number) => min + Math.random() * (max - min);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

export type Palette = ReturnType<typeof palette>;

// The site's colours, and the game's own: paper, and the steel of the blades
export function palette() {
  const tokens = readTokens();
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return {
    line: tokens.line,
    faint: tokens.faint,
    muted: tokens.muted,
    ink: tokens.foreground,
    paper: dark ? "#e9e6dd" : "#fbfaf6",
    steel: dark ? "#b4bac3" : "#858c96",
    font: getComputedStyle(document.body).fontFamily,
  };
}
