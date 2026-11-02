import { GRID } from "@/components/Column";
import ProjectsMenu from "@/components/ProjectsMenu";
import { PROJECT_SECTIONS, PROJECTS } from "./Projects";

// Each section with its projects, leaving out the empty ones. Only what the
// menu shows is passed down, since it is a client component
const SECTIONS = PROJECT_SECTIONS.map((section) => ({
  ...section,
  projects: PROJECTS.filter((project) => project.section === section.id).map(({ slug, title }) => ({ slug, title })),
})).filter((section) => section.projects.length > 0);

// The menu lives in the layout, so it stays put (and keeps its scroll) while
// the project beside it changes
export default function ProjectsLayout({ children }: LayoutProps<"/projects">) {
  return (
    <div className={`${GRID} flex-1 content-start gap-y-8 py-8 sm:py-12`}>
      <ProjectsMenu sections={SECTIONS} />
      {children}
    </div>
  );
}
