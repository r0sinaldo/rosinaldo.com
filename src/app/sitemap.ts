import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/Site";
import { PROJECTS } from "./projects/Projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...PROJECTS.map((project) => `/projects/${project.slug}`)];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
