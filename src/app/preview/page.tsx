import type { Metadata } from "next";
import CosmicHero from "@/preview/CosmicHero";

// A page for one client to see, reached only by its link: not in any menu or
// the sitemap, and kept out of search engines
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default function Preview() {
  return <CosmicHero />;
}
