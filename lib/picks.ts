import history from "./history.json";
import models from "./models.json";
import type { Access } from "./match";

export const ACCESS_LABEL: Record<Access, string> = {
  free_limited: "Free (limited)",
  paid: "Paid plan",
  api_only: "API only",
};

const SHORT: Record<string, string> = {
  coding: "Coding",
  legal: "Legal",
  writing: "Writing",
  reasoning: "Reasoning",
  speed: "Speed",
  general: "General",
};

const H1: Record<string, string> = {
  coding: "Best AI model for coding right now",
  legal: "Best AI model for legal work and long documents right now",
  writing: "Best AI model for writing right now",
  reasoning: "Best AI model for reasoning and math right now",
  speed: "Best AI model for speed and high volume right now",
  general: "Best all-round AI model right now",
};

export type HistoryEntry = {
  category: string;
  leader: string;
  previous: string | null;
  date: string;
  evidence: string;
  type?: string;
};

export function entryKind(entry: { type?: string }) {
  return entry.type === "methodology" ? "methodology" : "change";
}

export function categoryBySlug(slug: string) {
  const found = Object.entries(models.categories).find(([, category]) => category.slug === slug);
  return found ? { key: found[0], category: found[1] } : null;
}

export function categoryEntries() {
  return Object.entries(models.categories);
}

export function historyFor(key: string) {
  return history.entries
    .filter((entry) => entry.category === key)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function latestChange(key: string): HistoryEntry | null {
  return historyFor(key)[0] ?? null;
}

export function categoryLastModified(key: string) {
  const latest = latestChange(key);
  return latest ? new Date(`${latest.date}T12:00:00Z`) : new Date(models.last_updated);
}

export function formatDay(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortLabel(slug: string) {
  return SHORT[slug] ?? slug;
}

export function categoryHeading(slug: string) {
  return H1[slug] ?? "Best AI model for this job right now";
}

export function changeTitle(
  entry: { type?: string; previous: string | null; leader: string },
  slug: string,
) {
  const label = shortLabel(slug);
  if (entryKind(entry) === "methodology") return `${label}: ranking method updated`;
  if (!entry.previous) return `${label}: ${entry.leader} (tracking began)`;
  return `${label}: ${entry.leader} overtook ${entry.previous}`;
}

export function historyBlurb(entry: { type?: string; previous: string | null; leader: string }) {
  if (entryKind(entry) === "methodology") {
    return `Ranking method updated. ${entry.leader} leads on the new signal. `;
  }
  if (entry.previous) return `${entry.leader} overtook ${entry.previous}. `;
  return `${entry.leader} is the first leader on record. `;
}

export function leaderBadge(
  sourcesAgreeing: number,
  sourcesChecked: number,
  signal: string,
  leaderScore: number | null,
  runnerScore: number | null,
) {
  if (
    leaderScore !== null &&
    runnerScore !== null &&
    leaderScore !== 0 &&
    Math.abs(leaderScore - runnerScore) / Math.abs(leaderScore) <= 0.01
  ) {
    return "Close race";
  }
  if (sourcesChecked > 1) return `${sourcesAgreeing} of ${sourcesChecked} sources agree`;
  return `Leads ${signal}`;
}

export function modelSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function changeId(date: string, slug: string) {
  return `${date.slice(0, 10)}-${slug}`;
}

export function isoWeek(date: string) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  const day = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(value.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((value.getTime() - firstThursday.getTime()) / 604800000);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function leaderLine(entry: { type?: string; previous: string | null; leader: string; date: string } | null) {
  if (!entry) return "No leader history is on record yet.";
  const since = formatDay(entry.date);
  if (entryKind(entry) === "methodology") {
    return `Ranking method updated ${since}. ${entry.leader} leads on the current signal.`;
  }
  if (!entry.previous) {
    return `#1 since ${since}. No earlier leader is on record.`;
  }
  return `#1 since ${since}, previously ${entry.previous}.`;
}
