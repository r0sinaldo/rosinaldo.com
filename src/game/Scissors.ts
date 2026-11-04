import { GROUND, type Palette } from "./World";

// Standing on the ground, points up; or, with `flying`, in the air at that
// height, points first
export type Scissors = { x: number; height: number; snips: boolean; phase: number; flying?: number };

const HANDLE = "#e5484d";

// A pair standing on its handles at `base`, points up. Each blade runs from
// one handle, through the pivot, to the tip on the other side, as they do
function drawStanding(
  context: CanvasRenderingContext2D,
  x: number,
  height: number,
  open: number,
  palette: Palette,
  base: number,
) {
  const pivot = base - height * 0.42;
  const loop = height * 0.15;
  const spread = height * (0.06 + 0.16 * open);
  for (const side of [-1, 1]) {
    const handle = { x: x + side * loop * 1.15, y: base - loop };
    const tip = { x: x - side * spread, y: base - height };
    context.fillStyle = palette.steel;
    context.beginPath();
    context.moveTo(handle.x, handle.y - loop * 0.6);
    context.lineTo(x + side * 2.6, pivot);
    context.lineTo(tip.x, tip.y);
    context.lineTo(x - side * 2.2, pivot + 2);
    context.closePath();
    context.fill();
    context.strokeStyle = palette.ink;
    context.lineWidth = 1.1;
    context.lineJoin = "round";
    context.stroke();
    context.strokeStyle = HANDLE;
    context.lineWidth = 2.8;
    context.beginPath();
    context.ellipse(handle.x, handle.y, loop * 0.95, loop * 0.8, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = palette.ink;
  context.beginPath();
  context.arc(x, pivot, 1.6, 0, Math.PI * 2);
  context.fill();
}

// Open by `open` (0 shut, 1 wide); a flying pair is the same scissors turned
// to fly points first, centred on its x
export function drawScissors(context: CanvasRenderingContext2D, scissors: Scissors, open: number, palette: Palette) {
  const { x, height, flying } = scissors;
  if (flying === undefined) return drawStanding(context, x, height, open, palette, GROUND);
  context.save();
  context.translate(x + height / 2, flying);
  context.rotate(-Math.PI / 2);
  drawStanding(context, 0, height, open, palette, 0);
  context.restore();
}
