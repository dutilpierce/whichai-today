import type { MetadataRoute } from "next";
import { compareRecords, confirmedChanges, modelRecords, weekRecords } from "@/lib/catalog";
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
    {
      url: "https://whichai.today/changes",
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    ...modelRecords().map((model) => ({
      url: `https://whichai.today/models/${model.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...compareRecords().map((item) => ({
      url: `https://whichai.today/compare/${item.pair}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...confirmedChanges().map((change) => ({
      url: `https://whichai.today/changes/${change.id}`,
      lastModified: new Date(`${change.date}T12:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...weekRecords().map((week) => ({
      url: `https://whichai.today/changes/week/${week.week}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
