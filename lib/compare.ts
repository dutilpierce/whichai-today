import { currentModels, historyMentioning, isHeld } from "./catalog";
import { categoryEntries, modelSlug } from "./picks";
import { canonicalSlug, pairSlugs, type Modality } from "./pair-slugs";
import { releaseEntries } from "./releases";
import site from "./site.json";

export type CompareSide = ReturnType<typeof currentModels>[number];

const SLOTS = [
  ["leader", "#1"],
  ["runner_up", "Alternative"],
  ["open_source_pick", "Open weights"],
] as const;

type Slot = (typeof SLOTS)[number][0];

export type Cell = { slot: Slot; rank: number; label: string; score: number | null } | null;

export type ScoreRow = {
  key: string;
  slug: string;
  display_name: string;
  emoji: string;
  signal: string;
  a: Cell;
  b: Cell;
  winner: "a" | "b" | null;
};

export type ComparePairRecord = {
  pair: string;
  modality: Modality;
  a: CompareSide;
  b: CompareSide;
  rows: ScoreRow[];
  /** Both models are ranked in at least one of the same jobs, so the page is a real head-to-head. */
  shared: boolean;
  /** Listed for search engines. Set by compare_index in site.json. */
  indexed: boolean;
};

export const MODALITY_LABEL: Record<Modality, string> = {
  text: "Chat and text models",
  image: "Image models",
  video: "Video models",
};

function cellFor(category: ReturnType<typeof categoryEntries>[number][1], slug: string): Cell {
  for (const [index, [slot, label]] of SLOTS.entries()) {
    const pick = category[slot];
    if (modelSlug(pick.name) === slug) {
      return { slot, rank: index + 1, label, score: pick.primary_score ?? null };
    }
  }
  return null;
}

/** One row per job where at least one of the two is a current pick. The higher stored slot wins the row. */
function scoreRows(a: CompareSide, b: CompareSide): ScoreRow[] {
  return categoryEntries()
    .map(([key, category]) => {
      const left = cellFor(category, a.slug);
      const right = cellFor(category, b.slug);
      const winner: ScoreRow["winner"] =
        left && right ? (left.rank < right.rank ? "a" : "b") : left ? "a" : right ? "b" : null;
      return {
        key,
        slug: category.slug,
        display_name: category.display_name,
        emoji: category.emoji,
        signal: category.primary_signal,
        a: left,
        b: right,
        winner,
      };
    })
    .filter((row) => row.a || row.b);
}

/** Today's #1 against the alternative in each job. */
function popularSlugs() {
  return new Set(
    categoryEntries().map(([, category]) =>
      canonicalSlug(modelSlug(category.leader.name), modelSlug(category.runner_up.name)),
    ),
  );
}

export function comparePairs(): ComparePairRecord[] {
  const bySlug = new Map(currentModels().map((model) => [model.slug, model]));
  const popular = popularSlugs();
  return pairSlugs()
    .filter((pair) => !isHeld(`/compare/${pair.slug}`))
    .flatMap((pair) => {
      const a = bySlug.get(pair.left);
      const b = bySlug.get(pair.right);
      if (!a || !b) return [];
      const rows = scoreRows(a, b);
      const shared = rows.some((row) => row.a && row.b);
      const indexed = site.compare_index === "shared" ? shared : popular.has(pair.slug);
      return [{ pair: pair.slug, modality: pair.modality, a, b, rows, shared, indexed }];
    });
}

export function sharedPairs() {
  return comparePairs().filter((record) => record.shared);
}

export function indexedPairs() {
  return comparePairs().filter((record) => record.indexed);
}

export function pairBySlug(slug: string) {
  return comparePairs().find((record) => record.pair === slug) ?? null;
}

export function pairUrl(left: string, right: string) {
  return `/compare/${canonicalSlug(modelSlug(left), modelSlug(right))}`;
}

export function tally(record: ComparePairRecord) {
  return {
    a: record.rows.filter((row) => row.winner === "a"),
    b: record.rows.filter((row) => row.winner === "b"),
    shared: record.rows.filter((row) => row.a && row.b),
  };
}

/** The earliest release entry with the model's exact name. */
export function releaseFor(name: string) {
  const slug = modelSlug(name);
  return (
    releaseEntries()
      .filter((entry) => modelSlug(entry.name) === slug)
      .sort((x, y) => x.date.localeCompare(y.date))[0] ?? null
  );
}

export function pairHistory(record: ComparePairRecord) {
  const seen = new Set<string>();
  return [...historyMentioning(record.a.name), ...historyMentioning(record.b.name)]
    .filter((entry) => {
      const id = `${entry.date}-${entry.category}-${entry.leader}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((x, y) => y.date.localeCompare(x.date));
}

/** Other head-to-heads for one model, the closest matchups first. */
export function pairsWith(slug: string, except?: string, limit = 6) {
  return sharedPairs()
    .filter((record) => record.pair !== except && (record.a.slug === slug || record.b.slug === slug))
    .sort((x, y) => tally(y).shared.length - tally(x).shared.length || x.pair.localeCompare(y.pair))
    .slice(0, limit)
    .map((record) => ({ record, other: record.a.slug === slug ? record.b : record.a }));
}

/** Today's #1 against the alternative in each job, one per pair. */
export function popularPairs() {
  const seen = new Set<string>();
  const out: { record: ComparePairRecord; category: string; leader: string }[] = [];
  for (const [, category] of categoryEntries()) {
    const record = pairBySlug(canonicalSlug(modelSlug(category.leader.name), modelSlug(category.runner_up.name)));
    if (!record || seen.has(record.pair)) continue;
    seen.add(record.pair);
    out.push({ record, category: category.display_name, leader: category.leader.name });
  }
  return out;
}

export function verdictLine(record: ComparePairRecord) {
  const { a, b } = tally(record);
  const jobs = (rows: ScoreRow[]) => rows.map((row) => row.display_name.toLowerCase()).join(", ");
  if (!a.length && !b.length) return `Neither ${record.a.name} nor ${record.b.name} is a current pick for any job.`;
  if (!b.length) return `${record.a.name} ranks ahead in every job we track where either appears (${jobs(a)}).`;
  if (!a.length) return `${record.b.name} ranks ahead in every job we track where either appears (${jobs(b)}).`;
  return `${record.a.name} ranks ahead for ${jobs(a)}. ${record.b.name} ranks ahead for ${jobs(b)}.`;
}
