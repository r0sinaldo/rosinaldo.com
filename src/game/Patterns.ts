import { GROUND, NEXT_JUMP, random } from "./World";

// The heights (centres) of scissors flying at the ball: one in the middle,
// to pass under or jump over; two low, to jump; two high, to stay under
const MIDDLE = [GROUND - 36];
const LOW = [GROUND - 13, GROUND - 31];
const HIGH = [GROUND - 34, GROUND - 54];

// What comes along, as arrangements of scissors, each at a time (s) from
// its start, and those side by side a few pixels on
type Placed = { at: number; offset?: number; height: number; flying?: number };

const ground = (at: number, height: number, offset = 0): Placed => ({ at, offset, height });
const flying = (at: number, heights: number[]): Placed[] => heights.map((flying) => ({ at, height: 27, flying }));

// Harder ones join in as the run goes on (`level`, 0 to 1), and grow more common
const PATTERNS: { from: number; weight: (level: number) => number; make: (level: number) => Placed[] }[] = [
  // One pair standing
  { from: 0, weight: (l) => 3 - 2.4 * l, make: (l) => [ground(0, random(20, 24 + 10 * l))] },
  // Two or three side by side, cleared in one jump
  { from: 0.05, weight: (l) => 1 + l, make: () => [ground(0, random(20, 26)), ground(0, random(18, 22), 27)] },
  {
    from: 0.4,
    weight: (l) => 0.5 + l,
    make: () => [ground(0, random(20, 24)), ground(0, random(18, 22), 27), ground(0, random(18, 22), 54)],
  },
  // Tall ones, for a jump made on time
  { from: 0.3, weight: (l) => 0.6 + l, make: () => [ground(0, random(34, 40))] },
  // In the air: in the middle, low, or high
  { from: 0.15, weight: (l) => 0.8 + l, make: () => flying(0, MIDDLE) },
  { from: 0.25, weight: (l) => 0.6 + l, make: () => flying(0, LOW) },
  { from: 0.25, weight: (l) => 0.6 + l, make: () => flying(0, HIGH) },
  // A run of jumps, one after another as soon as can be
  {
    from: 0.2,
    weight: (l) => 0.6 + 1.4 * l,
    make: (l) => [0, 1, 2].map((i) => ground(i * NEXT_JUMP, random(20, 24 + 8 * l))),
  },
  // Jump one, then stay down for the next; or the other way round
  { from: 0.35, weight: (l) => 0.5 + 1.5 * l, make: () => [ground(0, 24), ...flying(NEXT_JUMP, HIGH)] },
  { from: 0.45, weight: (l) => 0.5 + 1.5 * l, make: () => [...flying(0, HIGH), ground(0.62, 24)] },
];

// The next arrangement, picked by weight among those open at this level
export function pattern(level: number) {
  const open = PATTERNS.filter(({ from }) => level >= from);
  const weights = open.map(({ weight }) => Math.max(0, weight(level)));
  let pick = Math.random() * weights.reduce((sum, w) => sum + w, 0);
  const index = weights.findIndex((w) => (pick -= w) < 0);
  return open[index < 0 ? 0 : index].make(level);
}
