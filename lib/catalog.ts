import archiveFile from "./archive.json";
import history from "./history.json";
import models from "./models.json";
import { held } from "./held";
import type { ModelProfile } from "./match";
import {
  changeId,
  comparePair,
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

export type RetiredCompare = {
  pair: string;
  category_slug: string;
};

const archive = archiveFile as {
  models: ArchivedModel[];
  retired_compares: RetiredCompare[];
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
type Category = (typeof models.categories)[keyof typeof models.categories];

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

export function compareRecords() {
  const map = new Map<
    string,
    {
      pair: string;
      leader: ModelProfile;
      runner: ModelProfile;
      categories: Category[];
    }
  >();

  for (const category of Object.values(models.categories)) {
    const pair = comparePair(category.leader.name, category.runner_up.name);
    const existing = map.get(pair) ?? {
      pair,
      leader: category.leader as ModelProfile,
      runner: category.runner_up as ModelProfile,
      categories: [] as Category[],
    };
    existing.categories.push(category);
    map.set(pair, existing);
  }

  return [...map.values()].filter((item) => !isHeld(`/compare/${item.pair}`));
}

export function compareByPair(pair: string) {
  return compareRecords().find((item) => item.pair === pair) ?? null;
}

export function confirmedChanges() {
  return history.entries
    .filter((entry) => entry.previous)
    .map((entry) => {
      const category = models.categories[entry.category as keyof typeof models.categories];
      return {
        ...entry,
        id: changeId(entry.date, category.slug),
        slug: category.slug,
        category,
      };
    })
    .filter((entry) => !isHeld(`/changes/${entry.id}`));
}

export function changeById(id: string) {
  return confirmedChanges().find((entry) => entry.id === id) ?? null;
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

