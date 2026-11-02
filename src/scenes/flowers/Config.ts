// The garden's composition. Positions are in world units for the camera in
// SCENE_CAMERA (4.5 away, 45°), where the frame spans about ±3 across and
// ±1.9 high at depth 0

// Seconds for one bloom: bud, open, rest, close
export const CYCLE = 10;
// Each bloom of a flower takes the next colour, so the garden keeps changing
export const PALETTE = ["#ff4d8d", "#ffd23f", "#fdfcff", "#b388ff", "#ff8fa3", "#ffb703", "#7bdff2"];
export const OUTER_PETALS = 10;
export const INNER_PETALS = 7;
export const SEPALS = 5;
export const POLLEN = 110;
export const FIREFLIES = 48;
export const COLORS = { stem: "#3f7d43", sepal: "#3c8a45" };

export type FlowerConfig = {
  head: [number, number, number];
  size: number;
  // Lean of the head (x, then y): flowers off to the sides turn in toward the middle
  tilt: [number, number];
  // Offset into the bloom cycle, so the flowers never open in unison
  phase: number;
};

// Three rows, so the garden has depth: large and low in front, smaller and
// higher behind. The middle stays fullest, because narrow (phone) frames
// only show the centre
export const FLOWERS: FlowerConfig[] = [
  { head: [0.15, -0.3, 0.3], size: 1, tilt: [0.15, -0.1], phase: 0 },
  { head: [-1.7, -0.55, 0.45], size: 0.9, tilt: [0.12, 0.3], phase: 0.12 },
  { head: [2.0, -0.6, 0.4], size: 0.88, tilt: [0.1, -0.35], phase: 0.58 },
  { head: [-2.9, -0.2, 0.2], size: 0.8, tilt: [0.18, 0.45], phase: 0.36 },
  { head: [2.95, -0.15, 0.1], size: 0.78, tilt: [0.15, -0.45], phase: 0.9 },
  { head: [-0.95, 0.2, 0], size: 0.82, tilt: [0.25, 0.35], phase: 0.22 },
  { head: [0.95, 0.5, -0.3], size: 0.72, tilt: [0.2, -0.4], phase: 0.45 },
  { head: [1.15, -0.55, -0.5], size: 0.6, tilt: [0.1, -0.5], phase: 0.83 },
  { head: [-2.2, 0.45, -0.3], size: 0.7, tilt: [0.22, 0.35], phase: 0.7 },
  { head: [2.25, 0.4, -0.35], size: 0.68, tilt: [0.2, -0.38], phase: 0.05 },
  { head: [-1.45, 1.05, -0.7], size: 0.56, tilt: [0.3, 0.2], phase: 0.5 },
  { head: [1.6, 1.15, -0.75], size: 0.55, tilt: [0.28, -0.2], phase: 0.28 },
  { head: [-0.25, 1.0, -0.6], size: 0.56, tilt: [0.3, 0.1], phase: 0.65 },
  { head: [0.55, 1.55, -1.2], size: 0.48, tilt: [0.32, -0.05], phase: 0.95 },
  { head: [-0.9, 1.55, -1.3], size: 0.46, tilt: [0.32, 0.12], phase: 0.18 },
  { head: [-2.8, 1.25, -1.2], size: 0.5, tilt: [0.28, 0.3], phase: 0.62 },
  { head: [2.9, 1.3, -1.25], size: 0.5, tilt: [0.28, -0.3], phase: 0.4 },
];

// Below the frame's bottom edge, so stems always run off screen
export const STEM_BOTTOM = -2.6;

// Where each stem's leaves grow: `at` along the stem (0 base, 1 flower),
// `around` which way they reach (-π/2 right, π/2 left, each angled a little
// toward the camera), `turn` on their own midrib to show their face
export const LEAVES = [
  { at: 0.4, around: -Math.PI / 2 - 0.45, turn: 0.55, size: 1 },
  { at: 0.62, around: Math.PI / 2 + 0.45, turn: -0.55, size: 0.82 },
];

// Three leaf shapes, used in turn, so no two neighbouring leaves match
export type LeafForm = { cup: number; droop: number; twist: number };
export const LEAF_FORMS: LeafForm[] = [
  { cup: 0.32, droop: 0.34, twist: 0.25 },
  { cup: 0.22, droop: 0.24, twist: -0.32 },
  { cup: 0.38, droop: 0.42, twist: 0.12 },
];
// The leaf stalk, as a share of the leaf's length
export const PETIOLE = 0.14;
