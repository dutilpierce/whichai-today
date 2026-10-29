import releasesFile from "./releases.json";

export type ReleaseKind = "model" | "update" | "feature" | "open_weights";
export type ReleaseStatus = "available" | "preview" | "announced";

export type Release = {
  id: string;
  date: string;
  added: string;
  name: string;
  provider: string;
  kind: ReleaseKind;
  status: ReleaseStatus;
  summary: string;
  features: string[];
  evidence: string;
  source_url: string;
};

const releases = releasesFile as unknown as { last_checked: string | null; entries: Release[] };

export const KIND_LABEL: Record<ReleaseKind, string> = {
  model: "New model",
  update: "Update",
  feature: "Feature",
  open_weights: "Open weights",
};

export const STATUS_LABEL: Record<ReleaseStatus, string | null> = {
  available: null,
  preview: "Preview",
  announced: "Announced",
};

export function releaseEntries() {
  return releases.entries;
}

export function lastChecked() {
  return releases.last_checked;
}

export function groupByDay<T extends { date: string }>(entries: T[]) {
  const days: { date: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last && last.date === entry.date) last.entries.push(entry);
    else days.push({ date: entry.date, entries: [entry] });
  }
  return days;
}

export function providerHue(provider: string) {
  let hash = 0;
  for (const char of provider.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function monogram(provider: string) {
  const words = provider.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return provider.slice(0, 1).toUpperCase();
}

export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function daysApart(from: string, to: string) {
  const start = new Date(`${from.slice(0, 10)}T12:00:00Z`).getTime();
  const end = new Date(`${to.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

export function releaseById(id: string) {
  return releases.entries.find((entry) => entry.id === id) ?? null;
}
