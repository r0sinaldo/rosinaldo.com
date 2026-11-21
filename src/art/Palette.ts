// The paints, after those of Pollock's pourings of 1949 to 1951 (Number 1,
// Lavender Mist, Autumn Rhythm, One): mostly a warm white, and now and then
// aluminium, a burnt sienna, a coral, a cobalt blue, a yellow ochre, or black
// enamel, which on the dark page shows only where it crosses other paint and
// where it catches the light. Enamel straight from the can: full colour, not
// muted. How often each is poured, out of 1
export const PAINTS = [
  { colour: "#f2efe6", share: 0.5 },
  { colour: "#b9c1ca", share: 0.1 },
  { colour: "#b5652b", share: 0.1 },
  { colour: "#ec7f62", share: 0.09 },
  { colour: "#3f86d1", share: 0.09 },
  { colour: "#e6ab32", share: 0.06 },
  { colour: "#141414", share: 0.06 },
];

export const WHITE = 0;

// A paint, by how often each is poured
export function pickPaint(random: () => number = Math.random) {
  let pick = random();
  const index = PAINTS.findIndex(({ share }) => (pick -= share) < 0);
  return index < 0 ? WHITE : index;
}
