// The photo the canvas variations delete (Dissolve, Burn, Shred, Fold), and
// what they need to take it apart: a canvas at the screen's pixel density,
// and the photo split into small cells

export const PHOTO = 144;
export const RADIUS = 20;
// The size the drawing is laid out at; it is scaled to the photo's size
const DRAWN = 112;
export const PHOTO_LABEL = "A picture of a phone on its lock screen";

// Sizes a canvas for the screen: whole device pixels per CSS pixel, so cells
// land exactly on them, and drawing done in CSS pixels
export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const scale = Math.max(1, Math.round(window.devicePixelRatio));
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  return { context, scale };
}

// An offscreen canvas of the same kind
export function offscreen(width: number, height: number) {
  return fitCanvas(document.createElement("canvas"), width, height);
}

// A phone on its lock screen, on a soft backdrop. Drawn rather than loaded, so
// it is crisp at any pixel density and its colours are known
const BODY = { x: 31, y: 8, width: 50, height: 96, radius: 10 };
const SCREEN = { x: 33.4, y: 10.4, width: 45.2, height: 91.2, radius: 7.8 };

// The time on the viewer's own clock, as their system writes it (12 or 24
// hours), but without AM or PM, as a lock screen shows it
function clock(now: Date) {
  const parts = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")}`;
}

function paint(context: CanvasRenderingContext2D) {
  const now = new Date();
  const time = clock(now);
  context.beginPath();
  context.roundRect(0, 0, PHOTO, PHOTO, RADIUS);
  context.clip();
  context.scale(PHOTO / DRAWN, PHOTO / DRAWN);

  const backdrop = context.createLinearGradient(0, 0, DRAWN, DRAWN);
  backdrop.addColorStop(0, "#f1f3f9");
  backdrop.addColorStop(1, "#dce2ee");
  context.fillStyle = backdrop;
  context.fillRect(0, 0, DRAWN, DRAWN);
  const glow = context.createRadialGradient(28, 18, 0, 28, 18, 70);
  glow.addColorStop(0, "rgb(255 255 255 / 0.8)");
  glow.addColorStop(1, "rgb(255 255 255 / 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, DRAWN, DRAWN);

  // The buttons on its sides, behind the body's edge
  context.fillStyle = "#3a3d46";
  for (const [x, y, height] of [
    [30.2, 24, 5],
    [30.2, 33, 9],
    [30.2, 45, 9],
    [80.4, 34, 14],
  ]) {
    context.beginPath();
    context.roundRect(x, y, 1.6, height, 0.8);
    context.fill();
  }

  // The body, casting a soft shadow down onto the backdrop
  context.save();
  context.shadowColor = "rgb(30 40 70 / 0.28)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 6;
  const frame = context.createLinearGradient(BODY.x, 0, BODY.x + BODY.width, 0);
  frame.addColorStop(0, "#4a4d57");
  frame.addColorStop(0.5, "#2a2c33");
  frame.addColorStop(1, "#3f424b");
  context.fillStyle = frame;
  context.beginPath();
  context.roundRect(BODY.x, BODY.y, BODY.width, BODY.height, BODY.radius);
  context.fill();
  context.restore();
  context.fillStyle = "#0b0b0e";
  context.beginPath();
  context.roundRect(BODY.x + 0.9, BODY.y + 0.9, BODY.width - 1.8, BODY.height - 1.8, BODY.radius - 0.9);
  context.fill();

  // The wallpaper: a deep gradient with soft blooms of colour in it
  context.save();
  context.beginPath();
  context.roundRect(SCREEN.x, SCREEN.y, SCREEN.width, SCREEN.height, SCREEN.radius);
  context.clip();
  const wallpaper = context.createLinearGradient(SCREEN.x, SCREEN.y, SCREEN.x + SCREEN.width, SCREEN.y + SCREEN.height);
  wallpaper.addColorStop(0, "#3b2f8f");
  wallpaper.addColorStop(0.55, "#6b4fd8");
  wallpaper.addColorStop(1, "#e7699a");
  context.fillStyle = wallpaper;
  context.fillRect(SCREEN.x, SCREEN.y, SCREEN.width, SCREEN.height);
  for (const [x, y, radius, colour] of [
    [40, 70, 26, "rgb(255 150 120 / 0.55)"],
    [74, 44, 22, "rgb(80 200 255 / 0.4)"],
    [50, 22, 18, "rgb(140 110 255 / 0.5)"],
  ] as const) {
    const bloom = context.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, colour);
    bloom.addColorStop(1, "rgb(255 255 255 / 0)");
    context.fillStyle = bloom;
    context.fillRect(SCREEN.x, SCREEN.y, SCREEN.width, SCREEN.height);
  }

  // The lock screen: status bar, the date and the time, the two shortcuts,
  // and the home bar
  const centre = SCREEN.x + SCREEN.width / 2;
  context.fillStyle = "#ffffff";
  context.textBaseline = "alphabetic";
  context.font = "600 3.4px system-ui, -apple-system, sans-serif";
  context.textAlign = "left";
  context.fillText(time, SCREEN.x + 4.6, SCREEN.y + 5.6);
  // Signal, and the battery
  for (let i = 0; i < 4; i++)
    context.fillRect(SCREEN.x + 33 + i * 1.1, SCREEN.y + 5.4 - (i + 1) * 0.7, 0.75, (i + 1) * 0.7);
  context.strokeStyle = "rgb(255 255 255 / 0.9)";
  context.lineWidth = 0.4;
  context.beginPath();
  context.roundRect(SCREEN.x + 38, SCREEN.y + 2.6, 4.4, 2.6, 0.7);
  context.stroke();
  context.fillRect(SCREEN.x + 38.6, SCREEN.y + 3.2, 3, 1.4);

  context.textAlign = "center";
  context.fillStyle = "rgb(255 255 255 / 0.85)";
  context.font = "500 3.4px system-ui, -apple-system, sans-serif";
  context.fillText(
    new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now),
    centre,
    SCREEN.y + 17,
  );
  context.fillStyle = "#ffffff";
  context.font = "600 15px system-ui, -apple-system, sans-serif";
  context.fillText(time, centre, SCREEN.y + 31);

  const shortcuts = SCREEN.y + SCREEN.height - 11;
  for (const x of [SCREEN.x + 8, SCREEN.x + SCREEN.width - 8]) {
    context.fillStyle = "rgb(20 15 40 / 0.35)";
    context.beginPath();
    context.arc(x, shortcuts, 3.6, 0, Math.PI * 2);
    context.fill();
  }
  // A torch on the left, a camera on the right
  context.fillStyle = "rgb(255 255 255 / 0.92)";
  context.beginPath();
  context.roundRect(SCREEN.x + 7.3, shortcuts - 0.6, 1.4, 2.4, 0.3);
  context.moveTo(SCREEN.x + 6.6, shortcuts - 1.9);
  context.lineTo(SCREEN.x + 9.4, shortcuts - 1.9);
  context.lineTo(SCREEN.x + 8.7, shortcuts - 0.6);
  context.lineTo(SCREEN.x + 7.3, shortcuts - 0.6);
  context.fill();
  const camera = SCREEN.x + SCREEN.width - 8;
  context.beginPath();
  context.roundRect(camera - 1.8, shortcuts - 1.1, 3.6, 2.5, 0.5);
  context.roundRect(camera - 0.7, shortcuts - 1.6, 1.4, 0.7, 0.2);
  context.fill();
  context.fillStyle = "rgb(60 40 110 / 0.9)";
  context.beginPath();
  context.arc(camera, shortcuts + 0.15, 0.7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgb(255 255 255 / 0.9)";
  context.beginPath();
  context.roundRect(centre - 8, SCREEN.y + SCREEN.height - 3.2, 16, 1, 0.5);
  context.fill();

  // The light on the glass
  const glare = context.createLinearGradient(
    SCREEN.x,
    SCREEN.y,
    SCREEN.x + SCREEN.width,
    SCREEN.y + SCREEN.height * 0.6,
  );
  glare.addColorStop(0, "rgb(255 255 255 / 0.16)");
  glare.addColorStop(0.45, "rgb(255 255 255 / 0.04)");
  glare.addColorStop(0.46, "rgb(255 255 255 / 0)");
  context.fillStyle = glare;
  context.fillRect(SCREEN.x, SCREEN.y, SCREEN.width, SCREEN.height);
  context.restore();

  // The island at the top of the screen
  context.fillStyle = "#050507";
  context.beginPath();
  context.roundRect(centre - 6.5, SCREEN.y + 2.2, 13, 3.6, 1.8);
  context.fill();
}

// The photo, painted once on its own canvas
export function photoCanvas() {
  const { context, scale } = offscreen(PHOTO, PHOTO);
  paint(context);
  return { photo: context.canvas, image: context.getImageData(0, 0, PHOTO * scale, PHOTO * scale), scale };
}

export type Cells = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  // The colour of each, as numbers (0–255, alpha 0–1) and ready to draw
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
  a: Float32Array;
  colour: string[];
};

// One cell for every size × size square of the photo with any colour in it,
// taking the colour of its most solid pixel. Squares on the rounded corners'
// soft edge count too, with their transparency: a pixel left out of every
// cell would never be cleared, and would stay behind when the rest has gone
export function photoCells(image: ImageData, scale: number, size: number): Cells {
  const found: number[][] = [];
  const side = size * scale;
  for (let y = 0; y < PHOTO; y += size) {
    for (let x = 0; x < PHOTO; x += size) {
      let solidest = -1;
      for (let dy = 0; dy < side; dy++) {
        for (let dx = 0; dx < side; dx++) {
          const i = ((y * scale + dy) * image.width + x * scale + dx) * 4;
          if (solidest < 0 || image.data[i + 3] > image.data[solidest + 3]) solidest = i;
        }
      }
      if (image.data[solidest + 3] === 0) continue;
      found.push([x, y, ...image.data.subarray(solidest, solidest + 4)]);
    }
  }
  const count = found.length;
  const cells: Cells = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    r: new Uint8Array(count),
    g: new Uint8Array(count),
    b: new Uint8Array(count),
    a: new Float32Array(count),
    colour: [],
  };
  found.forEach(([x, y, r, g, b, a], i) => {
    cells.x[i] = x;
    cells.y[i] = y;
    cells.r[i] = r;
    cells.g[i] = g;
    cells.b[i] = b;
    cells.a[i] = a / 255;
    cells.colour.push(`rgb(${r} ${g} ${b} / ${(a / 255).toFixed(2)})`);
  });
  return cells;
}
