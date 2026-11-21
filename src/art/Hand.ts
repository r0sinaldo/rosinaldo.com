import { pickPaint, WHITE } from "./Palette";

// The hand that pours the wet painting (see Wet), for as long as the page is
// open. It does what the still painting's was made of (see Pour), but in its
// own time, and never the same twice: loops over one another in the knot to
// the right, wider and lighter ones around it, a fast line thrown across.
// Between one and the next it rests a moment. Meanwhile, by its own clock,
// paint is let fall, high on the left or onto the knot, or flicked; and
// wherever paint gathered, it runs: a thin trail crawling down, slowing,
// thinning, and stopping in a bead. So something is always on the move, and
// rarely only one thing. No line keeps one width: each swells and narrows as
// the paint came off the stick; and now and then one is heavy, poured from
// a full can: thick, ragged at its edges, pooling, throwing paint off, and
// running wide. Everything is in the painting's own box (BOX, see Pour)

// Lays down one touch of paint: where, how wide, how thick, which paint (see
// Palette), and whether it is a drop (domed) rather than a touch of a line.
// Each line, run and flick is one paint, picked as it is begun
export type Emit = (x: number, y: number, radius: number, thick: number, paint: number, drop?: boolean) => void;

const TAU = Math.PI * 2;
const KNOT = { x: 700, y: 440, rx: 190, ry: 230 };
const AROUND = { x: 690, y: 450, rx: 310, ry: 400 };
// How far the hand moves in a second at its fastest, and a thrown line's speed
const PACE = 420;
const THROWN = 1500;

const between = (min: number, max: number) => min + Math.random() * (max - min);
const turn = (from: number, to: number) => ((to - from + Math.PI * 3) % TAU) - Math.PI;

type Line = {
  x: number;
  y: number;
  heading: number;
  curl: number;
  speed: number;
  base: number;
  length: number;
  done: number;
  owed: number;
  gap: number;
  // Kept to this oval; a thrown line has none, and bends evenly instead
  oval?: typeof KNOT;
  bend: number;
  paint: number;
  // How much its width wanders, and where the wandering has got to
  uneven: number;
  swell: number;
  heavy: boolean;
};

// Paint running down: where it has got to, how far it will go and how far it
// has gone, how wide it set off, how fast, its own lean, and a knot in it
type Run = {
  x: number;
  y: number;
  length: number;
  done: number;
  width: number;
  pace: number;
  lean: number;
  knot: number;
  owed: number;
  paint: number;
  uneven: number;
  swell: number;
};

// A width that wanders: a slow, smooth walk between about -1 and 1
const wander = (swell: number, pace: number) =>
  Math.max(-1.2, Math.min(1.2, swell * (1 - pace) + between(-1, 1) * pace * 3));

export function createHand(emit: Emit) {
  let rest = 0.9;
  let line: Line | null = null;
  let acts = 0;
  // The clock of what is let fall, apart from the hand's lines
  let falls = 0;
  let nextFall = 1.4;
  const runs: Run[] = [];

  // A touch of a line. Touches overlap along it, so each leaves only its
  // share of the line's thickness
  const touch = (x: number, y: number, radius: number, thick: number, paint: number) =>
    emit(x, y, radius, thick / Math.max(1, 3 * Math.max(radius, 0.45)), paint);

  // Paint gathered in one place; and, given a `length`, the run it sets off:
  // that many pixels down, at `pace` (px/s) to start with
  const drop = (
    x: number,
    y: number,
    radius: number,
    thick: number,
    paint: number,
    length = 0,
    pace = 0,
    uneven = 0.3,
  ) => {
    for (let i = 0; i < 5; i++) {
      const away = between(0, radius * 0.6);
      const angle = between(0, TAU);
      emit(x + Math.cos(angle) * away, y + Math.sin(angle) * away, radius * between(0.6, 1), thick / 2.5, paint, true);
    }
    if (length <= 0) return;
    const width = radius * between(0.5, 0.75);
    const lean = between(-0.12, 0.12);
    runs.push({ x, y, length, done: 0, width, pace, lean, knot: 0, owed: 0, paint, uneven, swell: between(-1, 1) });
  };

  // One pixel further down a run: wandering a little, thinning as it goes,
  // gathering now and then in a knot; at its end, a bead
  const trickle = (r: Run) => {
    r.lean = r.lean * 0.985 + between(-0.035, 0.035);
    r.x += r.lean;
    r.y += 1;
    r.done++;
    // Heavy runs sag now and then, the paint bunching before it goes on
    if (Math.random() < 0.004 + 0.008 * r.uneven) r.knot = between(0.8, 1.2 + 2 * r.uneven);
    r.knot *= 0.965;
    r.swell = wander(r.swell, 0.02);
    const swell = Math.max(0.35, 1 + r.uneven * r.swell);
    const radius = Math.max(0.45, (r.width / 2) * (1 - 0.6 * (r.done / r.length)) * (1 + r.knot) * swell);
    touch(r.x, r.y, radius, 0.2 + 0.12 * r.uneven, r.paint);
    // A wide run's edge is not straight either
    if (radius > 2.2) touch(r.x + between(-0.4, 0.4) * radius, r.y, radius * between(0.5, 0.8), 0.15, r.paint);
    if (r.done >= r.length) drop(r.x, r.y + 1, Math.max(1.3, radius * between(1.6, 2.1)), 0.9, r.paint);
  };

  const gesture = (oval: typeof KNOT, base: number, length: number, paint = pickPaint(), heavy = false) => {
    line = {
      x: oval.x + between(-0.6, 0.6) * oval.rx,
      y: oval.y + between(-0.6, 0.6) * oval.ry,
      heading: between(0, TAU),
      curl: between(-0.012, 0.012),
      speed: between(0.3, 0.9),
      base,
      length,
      done: 0,
      owed: 0,
      gap: 0,
      oval,
      bend: 0,
      paint,
      uneven: heavy ? 0.65 : 0.28,
      swell: between(-1, 1),
      heavy,
    };
    // Where the paint first lands
    drop(line.x, line.y, base * between(0.9, 1.4), between(0.5, 1.3) * (heavy ? 1.8 : 1), paint);
  };

  const sweep = () => {
    const from = [between(120, 340), between(100, 780)];
    const to = [between(820, 1010), between(120, 820)];
    line = {
      x: from[0],
      y: from[1],
      heading: Math.atan2(to[1] - from[1], to[0] - from[0]) + between(-0.2, 0.2),
      curl: 0,
      speed: 1,
      base: between(1, 1.5),
      length: Math.hypot(to[0] - from[0], to[1] - from[1]),
      done: 0,
      owed: 0,
      gap: 0,
      bend: between(-0.0006, 0.0006),
      paint: pickPaint(),
      uneven: 0.35,
      swell: between(-1, 1),
      heavy: false,
    };
  };

  const flick = () => {
    const inKnot = Math.random() < 0.65;
    const x = inKnot ? KNOT.x + between(-240, 240) : between(180, 480);
    const y = inKnot ? KNOT.y + between(-300, 300) : between(60, 820);
    const way = between(0, TAU);
    const paint = pickPaint();
    for (let i = 0, n = between(5, 18); i < n; i++) {
      const far = -Math.log(1 - Math.random()) * 30;
      const aside = between(-0.5, 0.5) * (5 + far * 0.3);
      const radius = (0.5 + 3.2 * Math.random() ** 3) * (far < 18 ? 1.5 : 1);
      emit(
        x + Math.cos(way) * far - Math.sin(way) * aside,
        y + Math.sin(way) * far + Math.cos(way) * aside,
        radius,
        0.2 + radius * 0.14,
        paint,
        true,
      );
    }
  };

  // Let fall high on the left, to run a long way: fewer and finer the nearer
  // the words
  const column = () => {
    const near = Math.random() ** 0.8;
    // Now and then a heavy one, poured from a full can: wide, slow, bunching
    if (near > 0.45 && Math.random() < 0.22) {
      const x = 170 + 310 * near;
      return drop(x, between(-60, 200), between(9, 13), 1.6, pickPaint(), between(380, 780), between(70, 120), 0.6);
    }
    const radius = (2.2 + 4.4 * near) * between(0.7, 1.1);
    drop(170 + 310 * near, between(-60, 280), radius, 1.1, pickPaint(), between(320, 820), between(110, 200));
  };

  // Let fall onto the knot, to run a little way down through it
  const blot = () => {
    const x = KNOT.x + between(-170, 170);
    drop(x, KNOT.y + between(-220, 120), between(3, 5.5), 1.1, pickPaint(), between(80, 320), between(60, 120));
  };

  const begin = () => {
    acts++;
    // The first loop is always white: the painting's own colour, set first
    if (acts === 1) return gesture(KNOT, 4.2, 900, WHITE);
    const pick = Math.random();
    if (pick < 0.11) gesture(KNOT, between(7, 11), between(380, 800), pickPaint(), true);
    else if (pick < 0.62) gesture(KNOT, between(2.4, 4.8), between(500, 1400));
    else if (pick < 0.84) gesture(AROUND, between(1.2, 1.8), between(900, 1700));
    else sweep();
  };

  // What is let fall: the first few close together, so the columns are soon
  // under way; then every few seconds
  const fall = () => {
    falls++;
    const pick = Math.random();
    if (falls <= 3 || pick < 0.4) column();
    else if (pick < 0.7) blot();
    else flick();
    nextFall = falls < 3 ? between(0.8, 1.6) : between(2.5, 6);
  };

  // One pixel further along the line
  const step = (l: Line) => {
    if (l.oval) {
      l.curl = l.curl * 0.996 + between(-0.0011, 0.0011);
      // A sudden change of mind
      if (Math.random() < 0.0028) l.curl = between(0.008, 0.03) * (Math.random() < 0.5 ? -1 : 1);
      l.heading += l.curl;
      if (((l.x - l.oval.x) / l.oval.rx) ** 2 + ((l.y - l.oval.y) / l.oval.ry) ** 2 > 1) {
        l.heading += turn(l.heading, Math.atan2(l.oval.y - l.y, l.oval.x - l.x)) * 0.022;
      }
      l.speed = Math.min(1, Math.max(0.12, l.speed + between(-0.018, 0.018)));
    } else l.heading += l.bend;
    const fromX = l.x;
    const fromY = l.y;
    l.x += Math.cos(l.heading);
    l.y += Math.sin(l.heading);
    l.done++;

    // Slow paint lies thick, fast paint thin; a thrown line thins as it goes;
    // and a line tapers at its ends
    const taper = Math.min(1, l.done / 30, (l.length - l.done) / 40);
    l.swell = wander(l.swell, l.heavy ? 0.03 : 0.015);
    const swell = Math.max(0.3, 1 + l.uneven * l.swell);
    const width =
      swell *
      (l.oval ? l.base * (1.95 - 1.6 * l.speed) * (0.3 + 0.7 * taper) : l.base * (1.5 - 1.1 * (l.done / l.length)));
    // A fast, thin line skips
    if (l.gap > 0) return l.gap--;
    if (width < 2.4 && Math.random() < 0.012) return (l.gap = 2 + Math.floor(Math.random() * 9));
    const radius = (width / 2) * between(0.85, 1.15);
    const thick = (l.oval ? 0.09 + 0.22 * (1 - l.speed) ** 1.5 : 0.11) * (l.heavy ? 1.7 : 1);
    touch((fromX + l.x) / 2, (fromY + l.y) / 2, radius, thick, l.paint);
    touch(l.x, l.y, radius, thick, l.paint);
    // A heavy line's edges are ragged: paint spreading out a little beside it
    if (l.heavy) {
      const aside = between(-0.55, 0.55) * radius;
      const x = l.x - Math.sin(l.heading) * aside;
      const y = l.y + Math.cos(l.heading) * aside;
      touch(x, y, radius * between(0.45, 0.8), thick * 0.7, l.paint);
    }
    // A heavy line throws droplets clear of itself
    if (width > 3.2 && Math.random() < (l.heavy ? 0.05 : 0.02)) {
      const angle = between(0, TAU);
      const away = radius * between(1.6, 4.5);
      emit(
        l.x + Math.cos(angle) * away,
        l.y + Math.sin(angle) * away,
        between(0.35, 0.5 + radius * 0.3),
        0.22,
        l.paint,
        true,
      );
    }
    // Where the hand all but stopped, it pooled; and a pool runs, a little
    if (l.oval && l.speed < 0.2 && Math.random() < 0.014) {
      drop(l.x, l.y, Math.max(2.2, width * 0.7), 1, l.paint, between(25, 140), between(35, 80));
    }
    // A heavy line can't hold all its paint: it lets go of some, here and
    // there, to run wide
    if (l.heavy && Math.random() < 0.006) {
      drop(l.x, l.y, width * between(0.7, 1), 1.4, l.paint, between(60, 260), between(45, 90), 0.6);
    }
  };

  return {
    // `dt` seconds on
    move(dt: number) {
      // The runs: fast as they set off, slowing as they spend themselves
      for (let i = runs.length - 1; i >= 0; i--) {
        const r = runs[i];
        r.owed += (r.pace * (1 - r.done / r.length) ** 1.6 + 3) * dt;
        for (; r.owed >= 1 && r.done < r.length; r.owed--) trickle(r);
        if (r.done >= r.length) runs.splice(i, 1);
      }
      nextFall -= dt;
      if (nextFall <= 0) fall();

      if (!line) {
        rest -= dt;
        if (rest > 0) return;
        begin();
        return;
      }
      // A heavy line goes slower: there is more paint to lay down
      line.owed += (line.oval ? PACE * (0.3 + line.speed) * (line.heavy ? 0.55 : 1) : THROWN) * dt;
      for (let i = 0; i < 60 && line.owed >= 1 && line.done < line.length; i++, line.owed--) step(line);
      if (line.done >= line.length) {
        line = null;
        rest = acts < 5 ? between(0.1, 0.4) : between(0.5, 2.6);
      }
    },
  };
}
