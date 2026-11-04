import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/Site";
import { LABS } from "./lab/Labs";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/lab", ...LABS.map((lab) => `/lab/${lab.slug}`)];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
