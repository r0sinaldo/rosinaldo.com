import { seeded } from "@/lib/Random";
import { IMAGE, LIGHTS, NOZZLE, ROCKET, STARS } from "./Layout";

// The space that keeps moving, quietly, for as long as the page is open: the
// bright stars and the planet's lights twinkle, fine dust drifts past (a
// little against the pointer, for depth), two clouds of the nebula breathe,
// and now and then a star falls. Drawn over the picture, in its pixels

type Twinkle = { x: number; y: number; size: number; strength: number; period: number; phase: number; warm: boolean };
type Dust = { x: number; y: number; depth: number; drift: number; phase: number };
type Shot = { x: number; y: number; start: number };

export type Ambient = {
  twinkles: Twinkle[];
  dust: Dust[];
  shot: Shot | null;
  nextShot: number;
  firstShot: boolean;
  random: () => number;
  sprites: { cool: HTMLCanvasElement; warm: HTMLCanvasElement };
};

const SHOT = { length: 240, duration: 1.1, angle: (28 * Math.PI) / 180 };

const TAU = Math.PI * 2;

// The rocket floats: it turns a fraction of a degree about its nozzle, so the
// painted trail stays joined to it, and drifts a couple of pixels across its
// path and along it. In the picture's pixels and radians
export function rocketMotion(t: number) {
  const across = 2.4 * Math.sin((TAU * t) / 7.3 + 1);
  const along = 1.4 * Math.sin((TAU * t) / 4.6);
  const flight = NOZZLE.angle + Math.PI;
  return {
    x: Math.cos(flight) * along - Math.sin(flight) * across,
    y: Math.sin(flight) * along + Math.cos(flight) * across,
    angle: 0.011 * Math.sin((TAU * t) / 5.9 + 0.4) + 0.004 * Math.sin((TAU * t) / 2.7),
  };
}
// Where the rocket turns about, as a fraction of its box
export const ROCKET_PIVOT = {
  x: (NOZZLE.x - ROCKET.left) / ROCKET.width,
  y: (NOZZLE.y - ROCKET.top) / ROCKET.height,
};

// The rocks in front of the planet drift a few pixels and turn a degree or
// so, each at its own slow pace; the nearer the rock, the more
export function rockMotion(i: number, t: number) {
  return {
    x: 3.2 * Math.sin((TAU * t) / (15 + 4 * i) + i * 1.7),
    y: 2.6 * Math.cos((TAU * t) / (19 + 3 * i) + i * 2.3),
    angle: 0.022 * Math.sin((TAU * t) / (23 + 6 * i) + i),
  };
}

// The flame's flicker: quick, small and never repeating exactly
function flicker(t: number) {
  return (
    0.45 * Math.sin(t * 31.3) +
    0.3 * Math.sin(t * 47.9 + 1.3) +
    0.25 * Math.sin(t * 73.1 + 2.1) +
    0.5 * Math.sin(t * 2.3) * Math.sin(t * 0.9 + 0.5)
  );
}

// A soft lobe of light from the origin along +x, `length` long
function lobe(context: CanvasRenderingContext2D, length: number, width: number, stops: [number, string][]) {
  context.save();
  context.scale(length, width);
  const g = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  context.fillStyle = g;
  context.beginPath();
  context.arc(0, 0, 1, -Math.PI / 2, Math.PI / 2);
  context.fill();
  context.restore();
}

function drawFlame(context: CanvasRenderingContext2D, k: number, t: number) {
  const m = rocketMotion(t);
  const f = flicker(t);
  context.save();
  context.translate((NOZZLE.x + m.x) * k, (NOZZLE.y + m.y) * k);
  context.rotate(NOZZLE.angle + m.angle);
  // The long, cool plume, breathing slowly
  context.globalAlpha = 0.16 + 0.03 * f;
  lobe(context, (150 + 10 * f) * k, 24 * k, [
    [0, "rgba(215,228,255,1)"],
    [0.35, "rgba(120,160,255,0.45)"],
    [1, "rgba(60,100,255,0)"],
  ]);
  // The hot core at the nozzle, flickering fast
  context.globalAlpha = 0.5 + 0.12 * f;
  lobe(context, (34 + 5 * f) * k, (9 + 0.8 * f) * k, [
    [0, "rgba(255,250,240,1)"],
    [0.3, "rgba(255,214,160,0.8)"],
    [0.65, "rgba(255,150,90,0.3)"],
    [1, "rgba(255,120,60,0)"],
  ]);
  context.restore();
  context.globalAlpha = 1;
}

function sprite(r: number, g: number, b: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, `rgba(255,255,255,1)`);
  glow.addColorStop(0.12, `rgba(${r},${g},${b},0.9)`);
  glow.addColorStop(0.4, `rgba(${r},${g},${b},0.25)`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

export function makeAmbient(): Ambient {
  const random = seeded(2592);
  const twinkle = ([x, y, strength]: [number, number, number], warm: boolean): Twinkle => ({
    x,
    y,
    strength,
    warm,
    size: warm ? 14 + 10 * strength : 16 + 26 * strength,
    period: warm ? 1.6 + random() * 2.4 : 2.8 + random() * 4,
    phase: random() * Math.PI * 2,
  });
  return {
    twinkles: [...STARS.map((s) => twinkle(s, false)), ...LIGHTS.map((s) => twinkle(s, true))],
    dust: Array.from({ length: 90 }, () => ({
      x: random() * IMAGE.width,
      y: random() * IMAGE.height,
      depth: 0.25 + random() * 0.75,
      drift: random() * 2 - 1,
      phase: random() * Math.PI * 2,
    })),
    shot: null,
    // The first falls just as he turns to look out into space, in front of
    // his eyes (see gazeAt in CosmicHero); after that, now and then
    nextShot: 11.5,
    firstShot: true,
    random,
    sprites: { cool: sprite(190, 210, 255), warm: sprite(255, 196, 140) },
  };
}

// `time` in seconds; `pointer` from -1 to 1 across the stage; `still` draws
// one calm frame with nothing moving, for visitors who prefer reduced motion
export function drawAmbient(
  context: CanvasRenderingContext2D,
  ambient: Ambient,
  time: number,
  dt: number,
  pointer: { x: number; y: number },
  still: boolean,
) {
  const { width, height } = context.canvas;
  const k = width / IMAGE.width;
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = "lighter";

  // The nebula's two clouds, swelling and drifting a few pixels
  const clouds: [number, number, number, string, number][] = [
    [1560, 170, 420, "120,80,255", 0],
    [640, 1000, 460, "60,110,255", 2.1],
  ];
  for (const [cx, cy, r, colour, offset] of clouds) {
    const t = still ? 0 : time;
    const x = (cx + Math.sin(t * 0.05 + offset) * 40) * k;
    const y = (cy + Math.cos(t * 0.04 + offset) * 24) * k;
    const alpha = 0.07 + 0.035 * Math.sin(t * 0.12 + offset);
    const glow = context.createRadialGradient(x, y, 0, x, y, r * k);
    glow.addColorStop(0, `rgba(${colour},${alpha})`);
    glow.addColorStop(1, `rgba(${colour},0)`);
    context.fillStyle = glow;
    context.fillRect(x - r * k, y - r * k, r * 2 * k, r * 2 * k);
  }

  // The far planet's atmosphere, brightening and dimming very slowly
  {
    const t = still ? 0 : time;
    const [px, py, pr] = [2697, 405, 307];
    const glow = context.createRadialGradient(px * k, py * k, pr * 0.86 * k, px * k, py * k, pr * 1.12 * k);
    glow.addColorStop(0, "rgba(90,150,255,0)");
    glow.addColorStop(0.45, `rgba(110,170,255,${0.07 + 0.035 * Math.sin(t * 0.35)})`);
    glow.addColorStop(1, "rgba(90,150,255,0)");
    context.fillStyle = glow;
    context.fillRect((px - pr * 1.12) * k, (py - pr * 1.12) * k, pr * 2.24 * k, pr * 2.24 * k);
  }

  drawFlame(context, k, still ? 0 : time);

  for (const s of ambient.twinkles) {
    const wave = still ? 0.5 : 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / s.period + s.phase);
    context.globalAlpha = (s.warm ? 0.55 : 0.4) * s.strength * wave * wave + 0.04;
    const size = s.size * k * (0.85 + 0.3 * wave);
    context.drawImage(
      s.warm ? ambient.sprites.warm : ambient.sprites.cool,
      s.x * k - size / 2,
      s.y * k - size / 2,
      size,
      size,
    );
  }

  // Dust: drifts left and a touch up or down, wrapping round
  context.fillStyle = "rgb(205,220,255)";
  for (const d of ambient.dust) {
    if (!still) {
      d.x -= (4 + 10 * d.depth) * dt;
      d.y += d.drift * 2 * d.depth * dt;
      if (d.x < -20) d.x += IMAGE.width + 40;
      if (d.y < -20) d.y += IMAGE.height + 40;
      if (d.y > IMAGE.height + 20) d.y -= IMAGE.height + 40;
    }
    const x = d.x * k - pointer.x * 14 * d.depth * k * 2;
    const y = d.y * k - pointer.y * 10 * d.depth * k * 2;
    context.globalAlpha = (0.12 + 0.4 * d.depth) * (still ? 0.7 : 0.6 + 0.4 * Math.sin(time * 0.9 + d.phase));
    const r = Math.max(0.6, (0.9 + 1.6 * d.depth) * k * 1.4);
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  // Now and then a falling star, across the open sky in the upper left
  if (!still) {
    if (!ambient.shot && time >= ambient.nextShot) {
      ambient.shot = ambient.firstShot
        ? { x: 880, y: 210, start: time }
        : { x: 420 + ambient.random() * 900, y: 40 + ambient.random() * 360, start: time };
      ambient.firstShot = false;
    }
    if (ambient.shot) {
      const p = (time - ambient.shot.start) / SHOT.duration;
      if (p >= 1) {
        ambient.shot = null;
        ambient.nextShot = time + 9 + ambient.random() * 9;
      } else {
        const travel = 520 * p;
        const hx = (ambient.shot.x + Math.cos(SHOT.angle) * travel) * k;
        const hy = (ambient.shot.y + Math.sin(SHOT.angle) * travel) * k;
        const tx = hx - Math.cos(SHOT.angle) * SHOT.length * k;
        const ty = hy - Math.sin(SHOT.angle) * SHOT.length * k;
        const trail = context.createLinearGradient(tx, ty, hx, hy);
        trail.addColorStop(0, "rgba(190,210,255,0)");
        trail.addColorStop(1, "rgba(235,242,255,0.85)");
        context.globalAlpha = Math.sin(Math.PI * p);
        context.strokeStyle = trail;
        context.lineWidth = Math.max(1, 2.2 * k);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(tx, ty);
        context.lineTo(hx, hy);
        context.stroke();
      }
    }
  }

  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}

// The rock he stands on: fine glowing dust lifting off it all over and
// drifting up slowly, as it would in low gravity; grains in the rock now and
// then catching the light; and, while he gets up, a little dust his boots
// stir. Quiet, so it reads as texture rather than effect. Drawn in its own
// box over the figure, so some of it passes in front of his boots. In the
// picture's pixels, like the rest
export const GROUND = { left: 1420, top: 880, width: 1172, height: 574 };
// The rock's outline, traced on the picture
const ROCK: [number, number][] = [
  [1440, 1454],
  [1520, 1400],
  [1600, 1330],
  [1660, 1272],
  [1720, 1232],
  [1790, 1180],
  [1855, 1092],
  [1922, 1052],
  [1990, 1078],
  [2080, 1080],
  [2170, 1090],
  [2245, 1090],
  [2300, 1058],
  [2356, 1013],
  [2411, 980],
  [2467, 947],
  [2522, 935],
  [2592, 913],
  [2592, 1454],
];
const FOOT = { x: 2075, y: 1082 };

function inRock(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ROCK.length - 1; i < ROCK.length; j = i++) {
    const [xi, yi] = ROCK[i];
    const [xj, yj] = ROCK[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  warm: boolean;
  phase: number;
  wobble: number;
  glow: number;
};
type Glint = { x: number; y: number; period: number; phase: number; size: number };
export type Ground = { motes: Mote[]; glints: Glint[]; random: () => number; stirred: number };

const MOTES = 110;

// A point somewhere on the rock, any part of it alike
function onRock(r: () => number): [number, number] {
  for (let tries = 0; tries < 40; tries++) {
    const x = GROUND.left + r() * GROUND.width;
    const y = GROUND.top + r() * GROUND.height;
    if (inRock(x, y)) return [x, y];
  }
  return [FOOT.x, FOOT.y + 40];
}

function spawn(g: Ground, near = false): Mote {
  const r = g.random;
  const [x, y] = near ? [FOOT.x + (r() + r() - 1) * 70, FOOT.y + r() * 10] : onRock(r);
  return {
    x,
    y,
    vx: (r() * 2 - 1) * (near ? 14 : 9) + (near ? Math.sign(x - FOOT.x) * 5 : 0),
    vy: -(near ? 12 + r() * 14 : 9 + r() * 14),
    age: 0,
    life: near ? 2 + r() * 2 : 3 + r() * 4,
    size: near ? 1.5 + r() * 1.6 : 1.3 + r() * 1.9,
    warm: r() < 0.2,
    phase: r() * Math.PI * 2,
    wobble: 4 + r() * 8,
    glow: near ? 0.6 + r() * 0.25 : 0.45 + r() * 0.35,
  };
}

export function makeGround(): Ground {
  const random = seeded(1082);
  const g: Ground = { motes: [], glints: [], random, stirred: 0 };
  for (let i = 0; i < MOTES; i++) {
    const m = spawn(g);
    // Start at any point in their lives, so the first frame is already alive
    m.age = random() * m.life;
    m.x += m.vx * m.age;
    m.y += m.vy * m.age;
    g.motes.push(m);
  }
  for (let i = 0; i < 18; i++) {
    const [x, y] = onRock(random);
    g.glints.push({ x, y, period: 4 + random() * 6, phase: random(), size: 5 + random() * 5 });
  }
  return g;
}

// `stir` from 0 to 1: how much his boots are moving the dust now
export function drawGround(
  context: CanvasRenderingContext2D,
  g: Ground,
  sprites: Ambient["sprites"],
  time: number,
  dt: number,
  stir: number,
  pointer: { x: number; y: number },
  still: boolean,
) {
  const { width, height } = context.canvas;
  const k = width / GROUND.width;
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = "lighter";
  const px = (x: number, depth: number) => (x - GROUND.left - pointer.x * 6 * depth) * k;
  const py = (y: number, depth: number) => (y - GROUND.top - pointer.y * 4 * depth) * k;

  // Grains in the rock, each flashing briefly now and then
  for (const s of g.glints) {
    const p = (((time / s.period + s.phase) % 1) + 1) % 1;
    const flash = still ? 0.15 : Math.max(0, 1 - Math.abs(p - 0.5) / 0.08) ** 2;
    if (flash <= 0.01) continue;
    const size = s.size * k * (0.6 + 0.6 * flash);
    context.globalAlpha = 0.45 * flash;
    context.drawImage(sprites.cool, px(s.x, 0.6) - size / 2, py(s.y, 0.6) - size / 2, size, size);
    // A small cross of light at the peak
    context.globalAlpha = 0.25 * flash;
    context.fillStyle = "rgb(220,235,255)";
    const arm = size * 0.6;
    const cx = px(s.x, 0.6);
    const cy = py(s.y, 0.6);
    context.fillRect(cx - arm, cy - 0.4 * k, arm * 2, 0.8 * k);
    context.fillRect(cx - 0.4 * k, cy - arm, 0.8 * k, arm * 2);
  }

  if (!still) {
    // While he gets up, extra dust round his boots
    g.stirred += stir * dt * 14;
    while (g.stirred >= 1 && g.motes.length < MOTES + 24) {
      g.stirred -= 1;
      g.motes.push(spawn(g, true));
    }
  }

  for (let i = g.motes.length - 1; i >= 0; i--) {
    const m = g.motes[i];
    if (!still) {
      m.age += dt;
      // Low gravity: it rises, slows a little, and drifts
      m.vy *= 1 - 0.12 * dt;
      m.vx *= 1 - 0.1 * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.age >= m.life) {
        if (g.motes.length > MOTES) g.motes.splice(i, 1);
        else g.motes[i] = spawn(g);
        continue;
      }
    }
    const p = m.age / m.life;
    const fade = Math.sin(Math.PI * p) ** 1.4;
    const twinkle = 0.75 + 0.25 * Math.sin(time * 5.3 + m.phase * 3);
    const depth = 0.4 + m.size / 4;
    const x = px(m.x + Math.sin(time * 1.6 + m.phase) * m.wobble, depth);
    const y = py(m.y, depth);
    const size = m.size * 9 * k;
    context.globalAlpha = m.glow * fade * twinkle;
    context.drawImage(m.warm ? sprites.warm : sprites.cool, x - size / 2, y - size / 2, size, size);
  }

  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}
