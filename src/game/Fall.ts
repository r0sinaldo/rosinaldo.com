// The page's fall at the start of a run: from where it waits, above the name
// at the top of the home page, down to where the ball lands on the game's
// line. A thrown object's path: a little pop up, then gravity, with the speed
// across worked out so it lands exactly there. In screen pixels, as the page
// is laid out between the two

type Point = { x: number; y: number };
export type Fall = { from: Point; across: number; up: number; duration: number };

const GRAVITY = 2600;
// The little lift as it is let go
const POP = -260;

export function planFall(from: Point, to: Point): Fall {
  const drop = Math.max(0, to.y - from.y);
  const duration = (-POP + Math.sqrt(POP * POP + 2 * GRAVITY * drop)) / GRAVITY;
  return { from, across: (to.x - from.x) / duration, up: POP, duration };
}

// Where it is `t` seconds into the fall
export function fallAt({ from, across, up }: Fall, t: number): Point {
  return { x: from.x + across * t, y: from.y + up * t + (GRAVITY * t * t) / 2 };
}
