import type { MetadataRoute } from "next";
import { compareRecords, confirmedChanges, methodologyUpdates, modelRecords, weekRecords } from "@/lib/catalog";
import { pageDates } from "@/lib/freshness";
import { categoryEntries } from "@/lib/picks";

function item(path: string, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], priority: number) {
  return {
    url: path === "/" ? "https://whichai.today" : `https://whichai.today${path}`,
    lastModified: pageDates(path).lastModified,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    item("/", "daily", 1),
    item("/about", "monthly", 0.8),
    item("/alerts", "weekly", 0.5),
    item("/privacy", "monthly", 0.3),
    item("/data", "daily", 0.5),
    item("/embed", "weekly", 0.4),
    ...categoryEntries().map(([, category]) => item(`/${category.slug}`, "daily", 0.7)),
    item("/changes", "daily", 0.6),
    ...modelRecords().map((model) => item(`/models/${model.slug}`, "daily", 0.6)),
    ...compareRecords().map((record) => item(`/compare/${record.pair}`, "daily", 0.6)),
    ...[...confirmedChanges(), ...methodologyUpdates()].map((change) =>
      item(`/changes/${change.id}`, "monthly", 0.5),
    ),
    ...weekRecords().map((week) => item(`/changes/week/${week.week}`, "weekly", 0.4)),
  ];
}
