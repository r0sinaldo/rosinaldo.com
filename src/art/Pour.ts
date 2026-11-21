import { seeded } from "@/lib/Random";
import { pickPaint, WHITE } from "./Palette";

// A painting in poured paint, made rather than copied, after Jackson Pollock's
// black pourings of 1951. Two parts, as those have: to the left, paint let
// fall, running down in thin columns; to the right, a knot of the hand's
// loops, thick where it slowed and thin where it sped up; a few fast lines
// thrown across from one to the other, and the spots flicked off on the way.
//
// Every line is laid down as paint is, not drawn: a trail of small round
// touches, each a little off and a little uneven, so edges are ragged; a pool
// where the paint first lands and a bead where a run ends; gaps where a fast,
// thin line skipped over the canvas; droplets thrown clear of the heavy ones.
//
// Laid out in a box of its own (BOX), whose right edge is the window's. The
// same painting every time

export const BOX = { width: 1000, height: 900 };

// Where in the box the paint actually goes, across: the columns start a
// little way in and the thrown lines reach its right edge
const PAINTED = { left: 120, right: 1010 };

// The painting's box, set in a wall `width` by `height`. Beside the words, as
// large as fits, against the window's right edge, half way up. Above them (on
// phones and on tablets held upright), its paint centred across the wall and
// as wide as it: the box may run past either side, where there is no paint.
// Returns a point of the box as a point of the wall, and how large a pixel of
// the box is on it
export function setIn(width: number, height: number, beside: boolean) {
  const painted = PAINTED.right - PAINTED.left;
  const scale = beside
    ? Math.min(width / BOX.width, height / BOX.height)
    : Math.min(width / painted, height / BOX.height);
  const left = beside ? width - BOX.width * scale : (width - painted * scale) / 2 - PAINTED.left * scale;
  const top = (height - BOX.height * scale) / 2;
  return { scale, left, top, place: (x: number, y: number) => [left + x * scale, top + y * scale] as const };
}

// Whether the wall hangs beside the words (fixed down the right of the
// window) rather than above them: the stylesheet decides (see WALL)
export const hangsBeside = (wall: HTMLElement) => getComputedStyle(wall).position === "fixed";

// What is poured in one go: its touches (x, y, radius, one after another), in
// the order they land, from `start` for `duration` (s). `fall`: let fall,
// slowing as it runs out, rather than moved by the hand. `paint`: which (see
// Palette)
export type Stroke = { touches: Float32Array; start: number; duration: number; fall: boolean; paint: number };

type Point = { x: number; y: number; width: number };

const TAU = Math.PI * 2;
// When the first paint lands: the page's words come in first
const BEGIN = 0.9;
// The smallest turn from one heading to another
const turn = (from: number, to: number) => ((to - from + Math.PI * 3) % TAU) - Math.PI;

function paint(): Stroke[] {
  const random = seeded(1951);
  const between = (min: number, max: number) => min + random() * (max - min);
  const strokes: Stroke[] = [];

  // Paint gathered in one place: a few touches over one another, off centre
  const pool = (touches: number[], x: number, y: number, radius: number) => {
    for (let i = 0, n = 4 + Math.floor(random() * 4); i < n; i++) {
      const away = between(0, radius * 0.7);
      const angle = between(0, TAU);
      touches.push(x + Math.cos(angle) * away, y + Math.sin(angle) * away, radius * between(0.55, 1));
    }
  };

  // A path (points a pixel apart) as the touches that lay it down
  const lay = (points: Point[], dry: boolean) => {
    const touches: number[] = [];
    let gap = 0;
    for (const { x, y, width } of points) {
      const radius = width / 2;
      // A fast, thin line skips
      if (gap > 0) {
        gap--;
        continue;
      }
      if (dry && width < 2.4 && random() < 0.012) {
        gap = 2 + Math.floor(random() * 9);
        continue;
      }
      touches.push(x + between(-0.25, 0.25) * radius, y + between(-0.25, 0.25) * radius, radius * between(0.82, 1.2));
      // A heavy line throws droplets clear of itself
      if (width > 3.2 && random() < 0.022) {
        const angle = between(0, TAU);
        const away = radius * between(1.6, 4.5);
        touches.push(x + Math.cos(angle) * away, y + Math.sin(angle) * away, between(0.35, 0.5 + radius * 0.3));
      }
    }
    return touches;
  };

  const add = (touches: number[], start: number, duration: number, fall = false) => {
    strokes.push({ touches: Float32Array.from(touches), start: BEGIN + start, duration, fall, paint: WHITE });
    return touches;
  };

  // The hand: a line that curls, changes its mind, slows and speeds up, kept
  // to an oval of the canvas
  const gesture = (
    start: number,
    oval: { x: number; y: number; rx: number; ry: number },
    base: number,
    length: number,
  ) => {
    let x = oval.x + between(-0.6, 0.6) * oval.rx;
    let y = oval.y + between(-0.6, 0.6) * oval.ry;
    let heading = between(0, TAU);
    let curl = between(-0.012, 0.012);
    let speed = between(0.3, 0.9);
    const points: Point[] = [];
    const pools: number[] = [];
    pool(pools, x, y, base * between(0.9, 1.5));
    for (let i = 0; i < length; i++) {
      curl = curl * 0.996 + between(-0.0011, 0.0011);
      if (random() < 0.0028) curl = between(0.008, 0.03) * (random() < 0.5 ? -1 : 1);
      heading += curl;
      if (((x - oval.x) / oval.rx) ** 2 + ((y - oval.y) / oval.ry) ** 2 > 1) {
        heading += turn(heading, Math.atan2(oval.y - y, oval.x - x)) * 0.022;
      }
      speed = Math.min(1, Math.max(0.12, speed + between(-0.018, 0.018)));
      x += Math.cos(heading);
      y += Math.sin(heading);
      // Slow paint lies thick, fast paint thin; and the line tapers at its ends
      const taper = Math.min(1, i / 30, (length - i) / 40);
      const width = base * (1.95 - 1.6 * speed) * (0.3 + 0.7 * taper);
      points.push({ x, y, width });
      // Where the hand all but stopped, it pooled
      if (speed < 0.2 && random() < 0.012) pool(pools, x, y, width * 0.75);
    }
    return add([...pools, ...lay(points, true)], start, length / 520);
  };

  // Paint let fall: it lands, and runs down, wandering a little, thinning as
  // it goes, gathering in knots, and ends in a bead
  const run = (start: number, x: number, y: number, base: number, length: number, pace: number, landing: number) => {
    const touches: number[] = [];
    if (landing) pool(touches, x, y, landing);
    const points: Point[] = [];
    let lean = between(-0.12, 0.12);
    let knot = 0;
    for (let i = 0; i < length; i++) {
      lean = lean * 0.985 + between(-0.035, 0.035);
      x += lean;
      y += 1;
      if (random() < 0.004) knot = between(0.8, 2);
      knot *= 0.965;
      points.push({ x, y, width: base * (1 - 0.6 * (i / length)) * (1 + knot) });
    }
    touches.push(...lay(points, false));
    touches.push(x, y + 1, base * between(0.75, 1.05));
    add(touches, start, length / pace, true);
  };

  // A line thrown across, fast: thin, nearly straight, skipping
  const sweep = (start: number, from: number[], to: number[], bend: number, base: number) => {
    const [ax, ay] = from;
    const [bx, by] = to;
    const length = Math.hypot(bx - ax, by - ay);
    // Bent about a point off the middle of it
    const cx = (ax + bx) / 2 - ((by - ay) / length) * bend;
    const cy = (ay + by) / 2 + ((bx - ax) / length) * bend;
    const points: Point[] = [];
    for (let i = 0; i <= length; i++) {
      const t = i / length;
      points.push({
        x: (1 - t) ** 2 * ax + 2 * t * (1 - t) * cx + t * t * bx,
        y: (1 - t) ** 2 * ay + 2 * t * (1 - t) * cy + t * t * by,
        // Heavier where it leaves the stick, a hair by the end
        width: base * (1.5 - 1.1 * t) * between(0.85, 1.15),
      });
    }
    add(lay(points, true), start, length / 1500);
  };

  // A scatter of spots thrown one way, the heavy ones falling short
  const flick = (start: number, x: number, y: number) => {
    const way = between(0, TAU);
    const touches: number[] = [];
    for (let i = 0, n = between(5, 18); i < n; i++) {
      const far = -Math.log(1 - random()) * 30;
      const aside = between(-0.5, 0.5) * (5 + far * 0.3);
      touches.push(
        x + Math.cos(way) * far - Math.sin(way) * aside,
        y + Math.sin(way) * far + Math.cos(way) * aside,
        (0.5 + 3.2 * random() ** 3) * (far < 18 ? 1.5 : 1),
      );
    }
    add(touches, start, 0.2);
  };

  // The knot, to the right: heavy loops over one another, then two wider,
  // lighter ones that leave it for the top and the right edge
  const KNOT = { x: 700, y: 440, rx: 190, ry: 230 };
  const heavy: number[][] = [];
  for (let i = 0; i < 6; i++) heavy.push(gesture(i * 0.5, KNOT, between(2.6, 5.2), between(700, 1500)));
  gesture(3.3, { x: 720, y: 400, rx: 300, ry: 420 }, 1.7, 1700);
  gesture(4.1, { x: 640, y: 520, rx: 330, ry: 360 }, 1.3, 1500);

  // The columns, to the left: fewer and finer the nearer the words
  for (let i = 0; i < 8; i++) {
    const near = random() ** 0.8;
    const base = 1.1 + 2.6 * near * between(0.6, 1);
    run(1 + i * 0.45, 170 + 310 * near, between(-90, 260), base, between(320, 820), 190, base * between(1.3, 2.2));
  }

  // Thrown across, from among the columns up into the knot and past it
  sweep(2.4, [150, 720], [930, 150], 90, 1.5);
  sweep(2.9, [260, 610], [1010, 330], -70, 1.2);
  sweep(3.6, [330, 110], [860, 800], 120, 1.1);

  for (let i = 0; i < 9; i++) {
    const inKnot = i % 3 > 0;
    flick(
      1 + i * 0.5,
      inKnot ? KNOT.x + between(-240, 240) : between(180, 480),
      inKnot ? KNOT.y + between(-300, 300) : between(60, 820),
    );
  }

  // And, long after, while the paint is still wet: now and then a little of
  // it lets go of the knot's heavy lines and runs slowly down, or a few more
  // spots land
  for (let i = 0, at = 13; i < 9; i++, at += between(9, 15)) {
    if (i % 3 === 2) {
      flick(at, KNOT.x + between(-260, 200), KNOT.y + between(-320, 320));
      continue;
    }
    const from = heavy[i % heavy.length];
    const touch = Math.floor(between(0.1, 0.9) * (from.length / 3)) * 3;
    run(at, from[touch], from[touch + 1], between(1, 1.7), between(140, 420), 48, 0);
  }

  // In the order it is poured, so that drawn all at once (the window resized,
  // or motion reduced) the same paint lies over the same paint
  // Two heavy lines, poured from a full can, ragged and swelling, and a heavy
  // run: made last, so all the rest is as it was
  for (const [start, x, y] of [
    [2.2, 690, 470],
    [3.9, 760, 360],
  ]) {
    const points: Point[] = [];
    let heading = between(0, TAU);
    let curl = between(-0.01, 0.01);
    let swell = 0;
    let px = x;
    let py = y;
    const length = between(420, 620);
    for (let i = 0; i < length; i++) {
      curl = curl * 0.995 + between(-0.0016, 0.0016);
      heading += curl;
      if (((px - KNOT.x) / KNOT.rx) ** 2 + ((py - KNOT.y) / KNOT.ry) ** 2 > 1) {
        heading += turn(heading, Math.atan2(KNOT.y - py, KNOT.x - px)) * 0.03;
      }
      px += Math.cos(heading);
      py += Math.sin(heading);
      swell = Math.max(-1.2, Math.min(1.2, swell * 0.97 + between(-0.09, 0.09)));
      const taper = Math.min(1, i / 25, (length - i) / 35);
      const width = between(7, 9) * Math.max(0.3, 1 + 0.6 * swell) * (0.3 + 0.7 * taper);
      points.push({ x: px, y: py, width });
      // Ragged: paint spreading out beside it
      const aside = between(-0.55, 0.55) * width * 0.5;
      points.push({ x: px - Math.sin(heading) * aside, y: py + Math.cos(heading) * aside, width: width * 0.6 });
    }
    add(lay(points, false), start, length / 300);
  }
  run(2.8, 455, between(20, 120), 5.5, 620, 100, 10);

  return strokes.sort((a, b) => a.start - b.start);
}

// Its paints, picked from their own seed, so the picking leaves the rest of the
// painting as it was. The first stroke stays white
export const PAINTING = (() => {
  const strokes = paint();
  const random = seeded(51);
  strokes.forEach((stroke, i) => (stroke.paint = i ? pickPaint(random) : WHITE));
  return strokes;
})();
