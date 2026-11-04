import { seeded } from "@/lib/Random";

// The post's picture: a city at night, drawn at exactly the size of its slot
// and at least twice the pixel density, so it is never scaled up and stays
// sharp on any screen

export const CITY_WIDTH = 280;
export const CITY_HEIGHT = 120;
export const CITY_LABEL = "An illustration of a city at night, its windows lit";

const WINDOW = ["#ffd27a", "#ffc35c", "#ffe2a6", "#ffb347"];
const COOL_WINDOW = "#bfe3ff";

type Skyline = {
  random: () => number;
  // The tallest and shortest a building gets, and how wide
  heights: [number, number];
  widths: [number, number];
  body: string;
  // How many windows are lit, and how bright they are
  lit: number;
  glow: number;
  window: { width: number; height: number; across: number; down: number };
  antennas?: boolean;
};

function skyline(context: CanvasRenderingContext2D, skyline: Skyline) {
  const { random, heights, widths, window } = skyline;
  const between = (range: [number, number]) => range[0] + random() * (range[1] - range[0]);
  for (let x = -6; x < CITY_WIDTH;) {
    const width = Math.round(between(widths));
    const height = Math.round(between(heights));
    const top = CITY_HEIGHT - height;

    context.fillStyle = skyline.body;
    context.fillRect(x, top, width, height);
    // The moonlit edge of the roof, so each building stands off the sky
    context.fillStyle = "rgb(190 200 255 / 0.12)";
    context.fillRect(x, top, width, 1);
    // Some step back near the top, as towers do
    const stepped = width > 22 && random() < 0.4;
    if (stepped) {
      const inset = Math.round(width * 0.2);
      context.fillRect(x + inset, top - 6, width - inset * 2, 6);
    }

    if (skyline.antennas && random() < 0.35) {
      const middle = x + Math.round(width / 2);
      const tip = top - (stepped ? 6 : 0) - 10 - Math.round(random() * 8);
      context.fillRect(middle, tip, 1, top - tip);
      // Its warning light, glowing a little into the dark around it
      const light = context.createRadialGradient(middle + 0.5, tip, 0, middle + 0.5, tip, 4);
      light.addColorStop(0, "rgb(255 90 90 / 0.9)");
      light.addColorStop(1, "rgb(255 90 90 / 0)");
      context.fillStyle = light;
      context.fillRect(middle - 4, tip - 4, 9, 8);
    }

    // The windows, lit in runs, as whole floors and offices are, not at random
    const columns = Math.floor((width - 4) / window.across);
    const offset = x + Math.round((width - columns * window.across + window.across - window.width) / 2);
    for (let y = top + 4; y + window.height < CITY_HEIGHT - 2; y += window.down) {
      const floor = random() < skyline.lit * 1.6 ? skyline.lit * 1.5 : skyline.lit * 0.4;
      for (let column = 0; column < columns; column++) {
        if (random() > floor) continue;
        context.globalAlpha = skyline.glow * (0.55 + random() * 0.45);
        context.fillStyle = random() < 0.12 ? COOL_WINDOW : WINDOW[Math.floor(random() * WINDOW.length)];
        context.fillRect(offset + column * window.across, y, window.width, window.height);
      }
    }
    context.globalAlpha = 1;

    x += width + (random() < 0.3 ? 2 : 0);
  }
}

function paint(context: CanvasRenderingContext2D) {
  const random = seeded(11);

  const sky = context.createLinearGradient(0, 0, 0, CITY_HEIGHT);
  sky.addColorStop(0, "#070a1f");
  sky.addColorStop(0.55, "#161a44");
  sky.addColorStop(1, "#3a2a5c");
  context.fillStyle = sky;
  context.fillRect(0, 0, CITY_WIDTH, CITY_HEIGHT);

  for (let i = 0; i < 70; i++) {
    context.globalAlpha = 0.25 + random() * 0.65;
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(random() * CITY_WIDTH, random() * 70, 0.25 + random() * 0.45, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  // The moon: a halo, then a crescent, its shadow cut with the sky itself
  const halo = context.createRadialGradient(230, 26, 6, 230, 26, 34);
  halo.addColorStop(0, "rgb(244 236 210 / 0.22)");
  halo.addColorStop(1, "rgb(244 236 210 / 0)");
  context.fillStyle = halo;
  context.fillRect(190, 0, 80, 64);
  context.fillStyle = "#f4ecd2";
  context.beginPath();
  context.arc(230, 26, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = sky;
  context.beginPath();
  context.arc(235, 22, 8, 0, Math.PI * 2);
  context.fill();

  // The city's own light, warming the haze just above the rooftops
  const haze = context.createLinearGradient(0, 40, 0, CITY_HEIGHT);
  haze.addColorStop(0, "rgb(255 140 110 / 0)");
  haze.addColorStop(1, "rgb(255 140 110 / 0.28)");
  context.fillStyle = haze;
  context.fillRect(0, 40, CITY_WIDTH, CITY_HEIGHT - 40);

  skyline(context, {
    random,
    heights: [34, 66],
    widths: [14, 30],
    body: "#262854",
    lit: 0.22,
    glow: 0.45,
    window: { width: 1, height: 1.5, across: 3, down: 4 },
  });
  skyline(context, {
    random,
    heights: [28, 88],
    widths: [18, 40],
    body: "#11143a",
    lit: 0.38,
    glow: 1,
    window: { width: 2, height: 2.5, across: 5, down: 6 },
    antennas: true,
  });

  // Street light, glowing up from below the frame
  const street = context.createLinearGradient(0, CITY_HEIGHT - 18, 0, CITY_HEIGHT);
  street.addColorStop(0, "rgb(255 170 90 / 0)");
  street.addColorStop(1, "rgb(255 170 90 / 0.3)");
  context.fillStyle = street;
  context.fillRect(0, CITY_HEIGHT - 18, CITY_WIDTH, 18);
}

export function cityCanvas() {
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio));
  const canvas = document.createElement("canvas");
  canvas.width = CITY_WIDTH * scale;
  canvas.height = CITY_HEIGHT * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  paint(context);
  return canvas;
}
