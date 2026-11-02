import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProjectPage from "@/components/ProjectPage";
import { PROJECTS } from "../Projects";

type Params = PageProps<"/projects/[slug]">["params"];

export function generateStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  return project ? { title: project.title, description: project.description } : {};
}

// Reading params suspends; inside a boundary, navigating between projects
// stays instant instead of waiting on it
export default function Project({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: Params }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectPage project={project} />;
}
