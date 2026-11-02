import type { SceneName } from "@/scenes/Scenes";

// The groups the projects menu is split into, in order. A section with no
// projects is left out of the menu, so one can be added before its first project
export const PROJECT_SECTIONS = [{ id: "threejs", title: "Three.js" }] as const;

type ProjectSection = (typeof PROJECT_SECTIONS)[number]["id"];

export type Project = {
  slug: string;
  section: ProjectSection;
  scene: SceneName;
  title: string;
  // One sentence: shown under the title, and as the page's description for
  // search engines and link previews
  description: string;
  tags: string[];
};

// Each project gets a page at /projects/[slug]; /projects opens the first one
export const PROJECTS: Project[] = [
  {
    slug: "flowers",
    section: "threejs",
    scene: "blooming-flowers",
    title: "Flowers",
    description: "A night garden where flowers bloom in new colours among drifting pollen and fireflies.",
    tags: ["GLSL", "Instancing", "Textures"],
  },
];
