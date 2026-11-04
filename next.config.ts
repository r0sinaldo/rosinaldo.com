import type { NextConfig } from "next";
import { LABS } from "./src/app/lab/Labs";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The site used to have one page per section; old links land on the home page
  async redirects() {
    return ["/about", "/experience", "/skills", "/blog", "/contact"].map((source) => ({
      source,
      destination: "/",
      permanent: true,
    }));
  },
  // A lab that doesn't exist gets a real 404. The page can't give it one: labs
  // share a prerendered shell, which commits the response to a 200 before the
  // page has read which lab was asked for
  async rewrites() {
    const known = LABS.map(({ slug }) => `${slug}$`).join("|");
    return [{ source: `/lab/:slug((?!${known})[^/]+)`, destination: "/not-a-page" }];
  },
  // Tailwind CSS 4 through its Turbopack loader, so no PostCSS config is needed
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
