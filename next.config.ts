import type { NextConfig } from "next";
import archiveFile from "./lib/archive.json";
import models from "./lib/models.json";

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const currentPairs = new Set(
  Object.values(models.categories).map(
    (category) => `${slug(category.leader.name)}-vs-${slug(category.runner_up.name)}`,
  ),
);

const retired = (archiveFile.retired_compares ?? []) as {
  pair: string;
  category_slug: string;
}[];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return retired
      .filter((item) => !currentPairs.has(item.pair))
      .map((item) => ({
        source: `/compare/${item.pair}`,
        destination: `/${item.category_slug}`,
        permanent: true,
      }));
  },
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
