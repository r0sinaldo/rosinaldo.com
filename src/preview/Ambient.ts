import { seeded } from "@/lib/Random";
import { IMAGE, LIGHTS, STARS } from "./Layout";

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
  random: () => number;
  sprites: { cool: HTMLCanvasElement; warm: HTMLCanvasElement };
};

const SHOT = { length: 240, duration: 1.1, angle: (28 * Math.PI) / 180 };

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
    nextShot: 6 + random() * 4,
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
      ambient.shot = { x: 420 + ambient.random() * 900, y: 40 + ambient.random() * 360, start: time };
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
