import { MODEL } from "./Ball";
import { easeInOut, easeOut, type Palette, SCALE } from "./World";

// The page an idea was written on: flat before the run, crumpling into the
// ball as it falls (see Fall), and the strip of it that slips out when the
// ball is cut

const SHEET = { width: 20, height: 26 };
// The lines of notebook paper
const RULE = "rgb(120 160 220 / 0.45)";
const MARGIN_RULE = "rgb(230 120 120 / 0.5)";

type Point = { x: number; y: number };

// Where a ray from the middle of the page, at `angle`, meets its edge
function onSheet(angle: number) {
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const reach = Math.min(SHEET.width / 2 / Math.abs(x || 1e-6), SHEET.height / 2 / Math.abs(y || 1e-6));
  return [x * reach, y * reach];
}

// The page, flat with its lines and a scribbled idea on it, or crumpled by
// `t` (0 to 1): its edge drawn in toward the ball's, the folds starting to
// show. Centred on the origin
export function drawSheet(context: CanvasRenderingContext2D, t: number, palette: Palette) {
  const e = easeInOut(t);
  const outline = MODEL.outline.map(([x, y], i) => {
    const [sx, sy] = onSheet(Math.atan2(y, x));
    // Wrinkling as it goes: each point pushed in and out a little
    const wrinkle = Math.sin(Math.PI * t) * (((i * 37) % 7) - 3) * 0.7;
    return [sx + (x - sx) * e + wrinkle, sy + (y - sy) * e + wrinkle * 0.6];
  });
  const trace = () => {
    context.beginPath();
    outline.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
  };

  trace();
  context.fillStyle = palette.paper;
  context.fill();
  context.save();
  context.clip();
  // Its lines and the idea, fading as it folds up
  context.globalAlpha = 1 - e;
  context.lineWidth = 0.5;
  context.strokeStyle = RULE;
  for (let y = -SHEET.height / 2 + 6; y < SHEET.height / 2; y += 4) {
    context.beginPath();
    context.moveTo(-SHEET.width / 2, y);
    context.lineTo(SHEET.width / 2, y);
    context.stroke();
  }
  context.strokeStyle = MARGIN_RULE;
  context.beginPath();
  context.moveTo(-SHEET.width / 2 + 4, -SHEET.height / 2);
  context.lineTo(-SHEET.width / 2 + 4, SHEET.height / 2);
  context.stroke();
  context.strokeStyle = palette.ink;
  context.lineWidth = 0.7;
  for (const [y, length] of [
    [-SHEET.height / 2 + 5.5, 11],
    [-SHEET.height / 2 + 9.5, 8],
  ]) {
    context.beginPath();
    for (let x = 0; x <= length; x += 0.5) {
      const px = -SHEET.width / 2 + 5.5 + x;
      const py = y + Math.sin(x * 2.1) * 0.7;
      if (x) context.lineTo(px, py);
      else context.moveTo(px, py);
    }
    context.stroke();
  }
  // The folds coming in
  context.globalAlpha = e * 0.5;
  context.lineWidth = 0.4;
  for (const { points } of MODEL.faces.filter((_, i) => i % 3 === 0)) {
    context.beginPath();
    points.forEach(([x, y], i) => (i ? context.lineTo(x * e, y * e) : context.moveTo(x * e, y * e)));
    context.stroke();
  }
  context.restore();

  trace();
  context.strokeStyle = palette.ink;
  context.globalAlpha = 0.45;
  context.lineWidth = 0.8;
  context.stroke();
  context.globalAlpha = 1;
}

// How wide the strip for an idea is
export function stripWidth(context: CanvasRenderingContext2D, idea: string, palette: Palette) {
  context.font = `italic ${12 / SCALE}px ${palette.font}`;
  return context.measureText(idea).width + 12 / SCALE + 4;
}

// The idea that slips out of the ball when it is cut: a strip torn from the
// page, rising from `from` to `to` (its top left) and unrolling as it goes
// (`t`, 0 to 1), then floating a little
export function drawIdea(
  context: CanvasRenderingContext2D,
  idea: string,
  t: number,
  from: Point,
  to: Point,
  time: number,
  palette: Palette,
) {
  const e = easeOut(t);
  const pad = 6 / SCALE;
  const width = stripWidth(context, idea, palette);
  const height = 20 / SCALE;
  const x = from.x + (to.x - from.x) * e;
  const y = from.y + (to.y - from.y) * e + (t >= 1 ? Math.sin(time * 1.8) * 0.6 : 0);
  context.save();
  context.translate(x, y);
  context.rotate(-0.22 + 0.17 * e);
  context.beginPath();
  context.rect(0, 0, width * e, height);
  context.clip();
  context.fillStyle = palette.paper;
  context.shadowColor = "rgb(0 0 0 / 0.12)";
  context.shadowBlur = 4;
  context.shadowOffsetY = 1;
  context.fillRect(0, 0, width, height);
  context.shadowColor = "transparent";
  context.lineWidth = 0.5;
  context.strokeStyle = MARGIN_RULE;
  context.beginPath();
  context.moveTo(pad / 2 + 1, 0);
  context.lineTo(pad / 2 + 1, height);
  context.stroke();
  context.strokeStyle = RULE;
  context.beginPath();
  context.moveTo(0, height - 3 / SCALE);
  context.lineTo(width, height - 3 / SCALE);
  context.stroke();
  context.fillStyle = palette.ink;
  context.globalAlpha = 0.85;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(idea, pad + 3, height / 2);
  context.restore();
}
