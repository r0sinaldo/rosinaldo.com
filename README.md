# rosinaldo.com

My personal site: a short home page beside a painting in poured paint, and a Lab of small interface experiments, each
playing live on its page.

## Highlights

- **A painting that keeps pouring.** The home page's painting, after Pollock's pourings, is poured wet on the GPU with
  three.js: a hand keeps pouring, the paint runs, dries and sinks away, lit as enamel. A still version, poured once in
  a 2D canvas, takes its place with reduced motion or where WebGL fails.
- **The Lab.** Pages of variations on one interaction (hold to confirm, loading skeletons), each a live demo. The
  index plays them on its cards; the pages have a table of contents and links to each section.
- **One layout grid.** Every page sits on a 12-column grid (4 on phones), drawn faintly behind it, with content on its
  lines through CSS subgrid.
- **Accessible by default.** Motion respects reduced-motion settings, every control works from the keyboard with one
  focus ring, and the demos announce their state to screen readers.

## Stack

[Next.js 16](https://nextjs.org) (App Router, Cache Components) · React 19 · TypeScript · [Three.js](https://threejs.org)
· [React Three Fiber](https://r3f.docs.pmnd.rs) · Tailwind CSS 4 · ESLint · Prettier

## Project structure

```
src/
├── app/            Routes: home, /lab and /lab/[slug] (Labs.ts lists the labs), metadata
├── art/            The home page's painting: still (Painting, Pour), wet (Living, Wet, Hand, Shaders)
├── components/     Layout grid, top bar, table of contents, lab page and cards
├── experiments/    The Lab's demos (hold/, skeleton/) and their registry (Demos.ts)
└── lib/            Small hooks and helpers
```

## Getting started

Requires Node.js 22 or newer (see `.nvmrc`).

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `npm run dev`    | Development server                                                     |
| `npm run build`  | Production build                                                       |
| `npm start`      | Serve the production build                                             |
| `npm run check`  | Lint, type-check and formatting check (what CI runs, before the build) |
| `npm run format` | Format every file with Prettier                                        |

## Checks

CI runs linting, type checking, the formatting check and a production build on every push to `main` and every pull
request (`npm run check` runs the first three locally).

## License

[MIT](LICENSE)
