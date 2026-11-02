import { redirect } from "next/navigation";
import { PROJECTS } from "./Projects";

export default function ProjectsPage() {
  redirect(`/projects/${PROJECTS[0].slug}`);
}
