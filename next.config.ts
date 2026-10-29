import type { NextConfig } from "next";
import { compareRedirects } from "./lib/pair-slugs";
import pairsFile from "./lib/pairs.json";

const appPairs = new Set(pairsFile.pairs.map((pair) => pair.slug));

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    const reversed = pairsFile.pairs
      .map((pair) => ({ source: `/vs/${pair.right}-vs-${pair.left}`, destination: `/vs/${pair.slug}`, permanent: true }))
      .filter((item) => !appPairs.has(item.source.slice(4)));
    return [...compareRedirects(), ...reversed];
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
