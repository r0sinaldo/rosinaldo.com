import { seeded } from "@/lib/Random";
import { rgbChannels } from "@/lib/Tokens";
import { BALL, type Palette } from "./World";

type Vertex = [number, number, number];
type Face = { points: [Vertex, Vertex, Vertex]; normal: Vertex };

// The ball, made once: crumpled paper as a ring of points around its edge, a
// smaller ring inside, and one near the middle, each at its own depth, with
// flat facets between them. Lit from a fixed light, the facets turn light and
// dark as it rolls, as folds in real paper do
export const MODEL = (() => {
  const random = seeded(23);
  const point = (angle: number, distance: number): Vertex => {
    const depth = Math.sqrt(Math.max(0, 1 - distance * distance)) * (0.75 + random() * 0.5);
    return [Math.cos(angle) * distance * BALL.radius, Math.sin(angle) * distance * BALL.radius, depth * BALL.radius];
  };
  const ring = (count: number, from: number, to: number, offset: number) =>
    Array.from({ length: count }, (_, i) => {
      const angle = ((i + offset + (random() - 0.5) * 0.6) / count) * Math.PI * 2;
      return { angle, vertex: point(angle, from + random() * (to - from)) };
    });
  const outer = ring(14, 0.84, 1.04, 0);
  const inner = ring(7, 0.42, 0.66, 0.5);
  const middle: Vertex = [(random() - 0.5) * 2.5, (random() - 0.5) * 2.5, BALL.radius];

  const faces: Face[] = [];
  const face = (a: Vertex, b: Vertex, c: Vertex) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal: Vertex = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    // Unit length, and facing the viewer
    const scale = (normal[2] < 0 ? -1 : 1) / (Math.hypot(...normal) || 1);
    faces.push({ points: [a, b, c], normal: normal.map((n) => n * scale) as Vertex });
  };
  // The band between the two rings, walked round both at once by angle
  const at = (list: typeof outer, i: number) => ({
    ...list[i % list.length],
    angle: list[i % list.length].angle + Math.floor(i / list.length) * Math.PI * 2,
  });
  for (let i = 0, j = 0; i < outer.length || j < inner.length;) {
    if (j >= inner.length || (i < outer.length && at(outer, i + 1).angle < at(inner, j + 1).angle)) {
      face(at(outer, i).vertex, at(outer, i + 1).vertex, at(inner, j).vertex);
      i++;
    } else {
      face(at(outer, i).vertex, at(inner, j + 1).vertex, at(inner, j).vertex);
      j++;
    }
  }
  inner.forEach(({ vertex }, j) => face(vertex, inner[(j + 1) % inner.length].vertex, middle));
  return { faces, outline: outer.map(({ vertex }) => vertex) };
})();

// From the upper left, a little in front
const LIGHT: Vertex = [-0.5, -0.65, 0.58];

// The ball turned by `angle`, centred on the origin: its facets moved round,
// and each lit by how it now faces the light
export function drawBall(context: CanvasRenderingContext2D, angle: number, { ink, paper }: Palette) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const turn = ([x, y]: Vertex) => [x * cos - y * sin, x * sin + y * cos];
  const trace = (points: Vertex[]) => {
    context.beginPath();
    points.forEach((point, i) => {
      const [x, y] = turn(point);
      if (i) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    context.closePath();
  };
  const [r, g, b] = rgbChannels(paper);
  context.lineJoin = "round";
  for (const { points, normal } of MODEL.faces) {
    const [nx, ny] = turn(normal);
    const light = nx * LIGHT[0] + ny * LIGHT[1] + normal[2] * LIGHT[2];
    const k = 0.72 + 0.38 * light;
    // Folds facing away go a touch cool, those facing the light a touch warm
    const colour = `rgb(${Math.min(255, r * k + 4 * light)} ${Math.min(255, g * k)} ${Math.min(255, b * k - 3 * light)})`;
    trace(points);
    context.fillStyle = colour;
    context.fill();
    // The fold between facets: the same colour to close the seam, and a
    // faint line of shadow along it
    context.strokeStyle = colour;
    context.lineWidth = 0.5;
    context.stroke();
    context.strokeStyle = ink;
    context.globalAlpha = 0.09;
    context.stroke();
    context.globalAlpha = 1;
  }
  trace(MODEL.outline);
  context.strokeStyle = ink;
  context.globalAlpha = 0.38;
  context.lineWidth = 0.8;
  context.stroke();
  context.globalAlpha = 1;
}
