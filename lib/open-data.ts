import history from "./history.json";
import models from "./models.json";
import { pageDates } from "./freshness";
import { entryKind } from "./picks";

export const DATA_LICENSE = "CC BY 4.0";
export const DATA_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const DATA_ATTRIBUTION = "WhichAI.today";

const SLOTS = ["leader", "runner_up", "open_source_pick"] as const;

export function picksDocument() {
  const rows = Object.values(models.categories).flatMap((category) =>
    SLOTS.map((slot) => {
      const pick = category[slot];
      return {
        category: category.slug,
        slot,
        name: pick.name,
        provider: pick.provider,
        primary_signal: category.primary_signal,
        primary_score: pick.primary_score,
        sources_agreeing: pick.sources_agreeing,
        sources_checked: pick.sources_checked,
        benchmark_context: pick.benchmark_context,
        cost: pick.cost,
        source_url: pick.source_url,
        updated: pageDates(`/${category.slug}`).changed,
      };
    }),
  );
  return {
    license: DATA_LICENSE,
    attribution: DATA_ATTRIBUTION,
    source: "https://whichai.today/data",
    generated: models.last_updated,
    last_updated: models.last_updated,
    rows,
  };
}

export function historyDocument() {
  const rows = history.entries.map((entry) => {
    const category = models.categories[entry.category as keyof typeof models.categories];
    return {
      date: entry.date,
      category: category?.slug ?? entry.category,
      leader: entry.leader,
      previous: entry.previous,
      type: entryKind(entry),
      evidence: entry.evidence,
    };
  });
  return {
    license: DATA_LICENSE,
    attribution: DATA_ATTRIBUTION,
    source: "https://whichai.today/data",
    generated: models.last_updated,
    rows,
  };
}

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    `# License: ${DATA_LICENSE}. Attribution: ${DATA_ATTRIBUTION}. Source: https://whichai.today/data`,
    headers.join(","),
    ...rows.map((row) => headers.map((header) => cell(row[header])).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}
