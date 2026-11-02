import type { NextConfig } from "next";

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
