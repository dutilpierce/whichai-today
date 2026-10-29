import type { MetadataRoute } from "next";
import { appList } from "@/lib/apps";
import { confirmedChanges, methodologyUpdates, modelRecords, weekRecords } from "@/lib/catalog";
import { indexedPairs } from "@/lib/compare";
import { releaseIndexed } from "@/lib/release-rows";
import { releaseEntries } from "@/lib/releases";
import { pageDates } from "@/lib/freshness";
import { categoryEntries } from "@/lib/picks";
import audiencesFile from "@/lib/audiences.json";
import guidesFile from "@/lib/prompt-guides.json";
import pairsFile from "@/lib/pairs.json";
import pickerFile from "@/lib/picker.json";
import tasksFile from "@/lib/tasks.json";

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
    item("/methodology", "monthly", 0.6),
    item("/alerts", "weekly", 0.5),
    item("/privacy", "monthly", 0.3),
    item("/data", "daily", 0.5),
    item("/free", "daily", 0.6),
    item("/prompt-builder", "monthly", 0.5),
    item("/suggest", "monthly", 0.3),
    item("/which-ai-should-i-use", "daily", 0.8),
    item("/pick", "monthly", 0.5),
    ...pickerFile.topics.map((topic) => item(`/pick/${topic.slug}`, "monthly", 0.4)),
    ...audiencesFile.audiences.map((audience) => item(`/for/${audience.slug}`, "weekly", 0.5)),
    ...appList().map((app) => item(`/apps/${app.slug}`, "weekly", 0.5)),
    ...pairsFile.pairs
      .filter((pair) => appList().some((app) => app.slug === pair.left) && appList().some((app) => app.slug === pair.right))
      .map((pair) => item(`/vs/${pair.slug}`, "daily", 0.6)),
    ...Object.keys(guidesFile.guides).map((assistant) => item(`/prompts/${assistant}`, "monthly", 0.5)),
    item("/embed", "weekly", 0.4),
    item("/tasks", "weekly", 0.6),
    ...tasksFile.tasks.map((task) => item(`/tasks/${task.slug}`, "daily", 0.6)),
    ...categoryEntries().map(([, category]) => item(`/${category.slug}`, "daily", 0.7)),
    item("/changes", "daily", 0.6),
    item("/releases", "hourly", 0.8),
    ...releaseEntries().filter(releaseIndexed).map((entry) => item(`/releases/${entry.id}`, "monthly", 0.5)),
    ...modelRecords().map((model) => item(`/models/${model.slug}`, "daily", 0.6)),
    item("/compare", "daily", 0.8),
    ...indexedPairs().map((record) => item(`/compare/${record.pair}`, "daily", 0.7)),
    ...[...confirmedChanges(), ...methodologyUpdates()].map((change) =>
      item(`/changes/${change.id}`, "monthly", 0.5),
    ),
    ...weekRecords().map((week) => item(`/changes/week/${week.week}`, "weekly", 0.4)),
  ];
}
