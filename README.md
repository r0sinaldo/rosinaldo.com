# rosinaldo.com

My personal site: a short, quiet home page (who I am and how to reach me) and the projects, one at a time: a minimal
menu of them on the left, the open one on the right, its live 3D scene running in a frame.

Built with Next.js, React Three Fiber and Three.js, with hand-written GLSL shaders for every scene.

## Highlights

- **A live garden.** Seventeen flowers in three rows bloom, close and bloom again in new colours, with hand-written
  shaders for the petals, stems that taper and curve, leaves cut from a photo of a real one (with its veins as relief),
  drifting pollen and fireflies flashing in their own rhythms. It slows down for visitors who prefer reduced motion.
- **A light, text-first home.** A single narrow column, a neutral gray scale that follows the system's light or dark
  theme, links whose underline only shows on hover, and a short cascade as the page comes in. Everything sits on a
  12-column layout grid (a CSS subgrid), its left edge always on a grid line: the projects menu takes the first three
  columns and the open project the rest. A project's frame stays dark whatever the theme.
- **One scene at a time.** Next keeps recently visited pages mounted but hidden; a hidden project drops its canvas,
  so only the scene on show renders and holds a WebGL context.
- **Accessible by default.** Scenes slow down for visitors who prefer reduced motion, and the projects menu works from
  the keyboard.
- **Works without WebGL.** Where WebGL is missing or a canvas fails, an error boundary takes over: every page keeps its
  text, without the scene.

## Stack

[Next.js 16](https://nextjs.org) (App Router, Cache Components) · React 19 · TypeScript ·
[React Three Fiber](https://r3f.docs.pmnd.rs) · [Three.js](https://threejs.org) ·
Tailwind CSS 4 · ESLint · Prettier

## Project structure

```
src/
├── app/                  Routes: the home page and the projects
│   └── projects/         The projects menu (layout), one page per project, and the project list
├── components/
│   └── …                 Projects menu, project page layout, the layout grid
├── scenes/               The scene registry, its canvas, and one folder per scene
└── lib/                  Small hooks and helpers
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
