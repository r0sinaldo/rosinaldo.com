import type { Project } from "@/app/projects/Projects";
import { riseDelay } from "@/lib/Rise";
import { SCENE_BACKGROUND } from "@/scenes/Scenes";
import ProjectScene from "./ProjectScene";

export default function ProjectPage({ project }: { project: Project }) {
  const { scene, title, description, tags } = project;

  return (
    <main className="col-span-4 min-w-0 sm:col-start-4 sm:col-end-13">
      <div
        className="relative h-[62svh] animate-rise overflow-hidden rounded-[4px] sm:h-[min(72svh,48rem)]"
        style={{ ...riseDelay(1), background: SCENE_BACKGROUND }}
      >
        <ProjectScene scene={scene} />
      </div>
      <div className="mt-4 animate-rise" style={riseDelay(2)}>
        <h1 className="leading-snug font-medium">{title}</h1>
        <p className="mt-1 text-pretty text-muted">{description}</p>
        <p className="mt-2 text-sm text-faint">{tags.join(" · ")}</p>
      </div>
    </main>
  );
}
