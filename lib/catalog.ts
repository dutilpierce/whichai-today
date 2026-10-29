import archiveFile from "./archive.json";
import history from "./history.json";
import models from "./models.json";
import { held } from "./held";
import type { ModelProfile } from "./match";
import {
  changeId,
  entryKind,
  isoWeek,
  modelSlug,
} from "./picks";

export type ArchivedModel = {
  name: string;
  provider: string;
  slug: string;
  where_to_get: string;
  cost: string;
  free_tier: string;
  direct_link: string;
  access: string;
};

const archive = archiveFile as {
  models: ArchivedModel[];
};

export function isHeld(path: string) {
  return held.pages.includes(path);
}

const ROLES = [
  ["leader", "Leader"],
  ["runner_up", "Alternative"],
  ["open_source_pick", "Open weights"],
] as const;

type Role = { slug: string; display_name: string; emoji: string; role: string };

export function currentModels() {
  const map = new Map<
    string,
    {
      slug: string;
      name: string;
      provider: string;
      profile: ModelProfile;
      roles: Role[];
      archived: false;
    }
  >();

  for (const category of Object.values(models.categories)) {
    for (const [slot, role] of ROLES) {
      const profile = category[slot];
      const slug = modelSlug(profile.name);
      const existing = map.get(slug) ?? {
        slug,
        name: profile.name,
        provider: profile.provider,
        profile: profile as ModelProfile,
        roles: [] as Role[],
        archived: false as const,
      };
      existing.roles.push({
        slug: category.slug,
        display_name: category.display_name,
        emoji: category.emoji,
        role,
      });
      map.set(slug, existing);
    }
  }

  return [...map.values()];
}

export function modelRecords() {
  const current = currentModels();
  const slugs = new Set(current.map((model) => model.slug));
  const retired = archive.models
    .filter((model) => !slugs.has(model.slug))
    .map((model) => ({
      slug: model.slug,
      name: model.name,
      provider: model.provider,
      profile: model as unknown as ModelProfile,
      roles: [] as Role[],
      archived: true as const,
    }));
  return [...current, ...retired].filter((model) => !isHeld(`/models/${model.slug}`));
}

export function modelBySlug(slug: string) {
  return modelRecords().find((model) => model.slug === slug) ?? null;
}

function mapChange(entry: (typeof history.entries)[number]) {
  const category = models.categories[entry.category as keyof typeof models.categories];
  return {
    ...entry,
    id: changeId(entry.date, category.slug),
    slug: category.slug,
    category,
  };
}

export function confirmedChanges() {
  return history.entries
    .filter((entry) => entry.previous && entryKind(entry) === "change")
    .map(mapChange)
    .filter((entry) => !isHeld(`/changes/${entry.id}`));
}

export function methodologyUpdates() {
  return history.entries
    .filter((entry) => entryKind(entry) === "methodology")
    .map(mapChange)
    .filter((entry) => !isHeld(`/changes/${entry.id}`));
}

export function changeById(id: string) {
  return [...confirmedChanges(), ...methodologyUpdates()].find((entry) => entry.id === id) ?? null;
}

export function weekRecords() {
  const map = new Map<string, ReturnType<typeof confirmedChanges>>();
  for (const change of confirmedChanges()) {
    const week = isoWeek(change.date);
    map.set(week, [...(map.get(week) ?? []), change]);
  }
  return [...map.entries()]
    .map(([week, changes]) => ({ week, changes }))
    .filter((item) => !isHeld(`/changes/week/${item.week}`));
}

export function weekById(week: string) {
  return weekRecords().find((item) => item.week === week) ?? null;
}

export function trackingStart() {
  const dates = history.entries.map((entry) => entry.date).sort();
  return dates[0] ?? models.last_updated.slice(0, 10);
}

export function historyMentioning(name: string) {
  return history.entries.filter((entry) => entry.leader === name || entry.previous === name);
}

