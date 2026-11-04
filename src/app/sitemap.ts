import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/Site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/"];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
