import { BOX } from "./Pour";

// The hand that pours the wet painting (see Wet), for as long as the page is
// open. It does what the still painting's was made of (see Pour), but in its
// own time, and never the same twice: loops over one another in the knot to
// the right, wider and lighter ones around it, a fast line thrown across, a
// flick of spots, and paint simply let fall, on the knot or high on the left,
// to run down by itself. Between one and the next it rests a moment.
// Everything is in the painting's own box (BOX)

// Lays down one touch of paint: where, how wide, how thick, and whether it
// is a drop (domed) rather than a touch of a line
export type Emit = (x: number, y: number, radius: number, thick: number, drop?: boolean) => void;

const TAU = Math.PI * 2;
const KNOT = { x: 700, y: 440, rx: 190, ry: 230 };
const AROUND = { x: 690, y: 450, rx: 310, ry: 400 };
// How far the hand moves in a second at its fastest, and a thrown line's speed
const PACE = 330;
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
};

export function createHand(emit: Emit) {
  let rest = 0.9;
  let line: Line | null = null;
  let acts = 0;

  // Paint gathered in one place, thick enough to run
  const drop = (x: number, y: number, radius: number, thick: number) => {
    for (let i = 0; i < 5; i++) {
      const away = between(0, radius * 0.6);
      const angle = between(0, TAU);
      emit(x + Math.cos(angle) * away, y + Math.sin(angle) * away, radius * between(0.6, 1), thick / 2.5, true);
    }
  };

  // A touch of a line. Touches overlap along it, so each leaves only its
  // share of the line's thickness
  const touch = (x: number, y: number, radius: number, thick: number) =>
    emit(x, y, radius, thick / Math.max(1, 3 * Math.max(radius, 0.45)));

  const gesture = (oval: typeof KNOT, base: number, length: number) => {
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
    };
    // Where the paint first lands
    drop(line.x, line.y, base * between(0.9, 1.4), between(0.5, 1.3));
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
    };
  };

  const flick = () => {
    const inKnot = Math.random() < 0.65;
    const x = inKnot ? KNOT.x + between(-240, 240) : between(180, 480);
    const y = inKnot ? KNOT.y + between(-300, 300) : between(60, 820);
    const way = between(0, TAU);
    for (let i = 0, n = between(5, 18); i < n; i++) {
      const far = -Math.log(1 - Math.random()) * 30;
      const aside = between(-0.5, 0.5) * (5 + far * 0.3);
      const radius = (0.5 + 3.2 * Math.random() ** 3) * (far < 18 ? 1.5 : 1);
      emit(
        x + Math.cos(way) * far - Math.sin(way) * aside,
        y + Math.sin(way) * far + Math.cos(way) * aside,
        radius,
        0.2 + radius * 0.14,
        true,
      );
    }
  };

  // Let fall high on the left, fewer and finer the nearer the words
  const column = () => {
    const near = Math.random() ** 0.8;
    drop(170 + 310 * near, between(-10, 280), between(5, 9) * (0.6 + 0.4 * near), between(2.4, 4.8));
  };

  const begin = () => {
    acts++;
    // The opening: the knot begins, and the first columns start to run
    if (acts === 1) return gesture(KNOT, 4, 1300);
    if (acts === 2 || acts === 4) return column();
    const pick = Math.random();
    if (pick < 0.48) gesture(KNOT, between(2.4, 4.8), between(500, 1500));
    else if (pick < 0.6) gesture(AROUND, between(1.2, 1.8), between(900, 1700));
    else if (pick < 0.74) column();
    else if (pick < 0.8)
      drop(KNOT.x + between(-170, 170), KNOT.y + between(-200, 120), between(3, 5), between(1.4, 2.8));
    else if (pick < 0.91) flick();
    else sweep();
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
    const width = l.oval
      ? l.base * (1.95 - 1.6 * l.speed) * (0.3 + 0.7 * taper)
      : l.base * (1.5 - 1.1 * (l.done / l.length));
    // A fast, thin line skips
    if (l.gap > 0) return l.gap--;
    if (width < 2.4 && Math.random() < 0.012) return (l.gap = 2 + Math.floor(Math.random() * 9));
    const radius = (width / 2) * between(0.85, 1.15);
    const thick = l.oval ? 0.09 + 0.22 * (1 - l.speed) ** 1.5 : 0.11;
    touch((fromX + l.x) / 2, (fromY + l.y) / 2, radius, thick);
    touch(l.x, l.y, radius, thick);
    // A heavy line throws droplets clear of itself
    if (width > 3.2 && Math.random() < 0.02) {
      const angle = between(0, TAU);
      const away = radius * between(1.6, 4.5);
      emit(l.x + Math.cos(angle) * away, l.y + Math.sin(angle) * away, between(0.35, 0.5 + radius * 0.3), 0.22, true);
    }
    // Where the hand all but stopped, it pooled; and a pool runs
    if (l.oval && l.speed < 0.2 && Math.random() < 0.014) drop(l.x, l.y, width * 0.7, between(1.1, 2.4));
  };

  return {
    // `dt` seconds on
    move(dt: number) {
      if (!line) {
        rest -= dt;
        if (rest > 0) return;
        begin();
        // Something let fall or flicked is done at once
        if (!line) rest = acts < 6 ? between(0.1, 0.5) : between(0.4, 2);
        return;
      }
      line.owed += (line.oval ? PACE * (0.3 + line.speed) : THROWN) * dt;
      for (let i = 0; i < 60 && line.owed >= 1 && line.done < line.length; i++, line.owed--) step(line);
      if (line.done >= line.length) {
        line = null;
        rest = acts < 6 ? between(0.1, 0.4) : between(0.5, 2.6);
      }
    },
  };
}

// The painting's box, set in a wall `width` by `height`: as large as fits,
// against the right edge, half way up. Returns a point of the box as a point
// of the wall, and how large a pixel of the box is on it
export function setIn(width: number, height: number) {
  const scale = Math.min(width / BOX.width, height / BOX.height);
  const left = width - BOX.width * scale;
  const top = (height - BOX.height * scale) / 2;
  return { scale, place: (x: number, y: number) => [left + x * scale, top + y * scale] as const };
}
