import type { MetadataRoute } from "next";
import { categoryEntries, categoryLastModified } from "@/lib/picks";
import models from "@/lib/models.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(models.last_updated);
  return [
    {
      url: "https://whichai.today",
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://whichai.today/about",
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://whichai.today/alerts",
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
    {
      url: "https://whichai.today/privacy",
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    ...categoryEntries().map(([key, category]) => ({
      url: `https://whichai.today/${category.slug}`,
      lastModified: categoryLastModified(key),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
