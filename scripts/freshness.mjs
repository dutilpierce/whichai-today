import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const FRESHNESS = new URL("../lib/freshness.json", import.meta.url);
const INDEXNOW = new URL("../indexnow-urls.json", import.meta.url);
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const STATIC_PAGES = {
  "/about": "app/about/page.tsx",
  "/privacy": "app/privacy/page.tsx",
  "/alerts": "app/alerts/page.tsx",
  "/methodology": "app/methodology/page.tsx",
  "/embed": "app/embed/page.tsx",
  "/data": "app/data/page.tsx",
  "/free": "app/free/page.tsx",
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function visiblePick(pick) {
  if (!pick) return null;
  const next = { ...pick };
  delete next.checked;
  return next;
}

function isoWeek(date) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  const day = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(value.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((value.getTime() - firstThursday.getTime()) / 604800000);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function entryKind(entry) {
  return entry.type === "methodology" ? "methodology" : "change";
}

export function buildPayloads({ models, history, providers, archive, tasks, files, held }) {
  const skip = new Set(held?.pages ?? []);
  const pages = {};
  const categories = Object.values(models.categories);

  function put(path, payload) {
    if (!skip.has(path)) pages[path] = payload;
  }

  put("/", categories.map((category) => ({
    slug: category.slug,
    leader: visiblePick(category.leader),
    runner_up: visiblePick(category.runner_up),
    open_source_pick: visiblePick(category.open_source_pick),
  })));

  for (const category of categories) {
    put(`/${category.slug}`, {
      display_name: category.display_name,
      primary_signal: category.primary_signal,
      sources: category.sources ?? [],
      leader: visiblePick(category.leader),
      runner_up: visiblePick(category.runner_up),
      open_source_pick: visiblePick(category.open_source_pick),
    });
  }

  const byModel = new Map();
  for (const category of categories) {
    for (const slot of SLOTS) {
      const pick = category[slot];
      const slug = slugify(pick.name);
      const existing = byModel.get(slug) ?? { name: pick.name, provider: pick.provider, slots: [] };
      existing.slots.push({ category: category.slug, slot, pick: visiblePick(pick) });
      byModel.set(slug, existing);
    }
  }
  for (const model of archive?.models ?? []) {
    if (byModel.has(model.slug)) continue;
    byModel.set(model.slug, {
      name: model.name,
      provider: model.provider,
      slots: [],
      archived: {
        where_to_get: model.where_to_get,
        cost: model.cost,
        free_tier: model.free_tier,
      },
    });
  }
  for (const [slug, model] of byModel) {
    put(`/models/${slug}`, {
      ...model,
      privacy: providers[model.provider] ?? null,
    });
  }

  const compares = new Map();
  for (const category of categories) {
    const pair = `${slugify(category.leader.name)}-vs-${slugify(category.runner_up.name)}`;
    const existing = compares.get(pair) ?? {
      leader: visiblePick(category.leader),
      runner: visiblePick(category.runner_up),
      categories: [],
    };
    existing.categories.push(category.slug);
    compares.set(pair, existing);
  }
  for (const [pair, payload] of compares) put(`/compare/${pair}`, payload);

  const logged = (history.entries ?? []).map((entry) => ({
    ...entry,
    type: entryKind(entry),
    slug: models.categories[entry.category]?.slug ?? entry.category,
  }));
  put("/changes", logged);
  for (const entry of logged) {
    if (!entry.previous && entry.type !== "methodology") continue;
    put(`/changes/${entry.date.slice(0, 10)}-${entry.slug}`, entry);
  }

  const weeks = new Map();
  for (const entry of logged) {
    if (entry.type !== "change" || !entry.previous) continue;
    const week = isoWeek(entry.date);
    weeks.set(week, [...(weeks.get(week) ?? []), entry]);
  }
  for (const [week, entries] of weeks) put(`/changes/week/${week}`, entries);

  for (const task of tasks?.tasks ?? []) {
    const category = categories.find((item) => item.slug === task.category);
    put(`/tasks/${task.slug}`, { task, category: category?.slug ?? null });
  }
  if ((tasks?.tasks ?? []).length) put("/tasks", tasks.tasks.map((task) => task.slug));

  for (const [path, text] of Object.entries(files ?? {})) {
    if (typeof text === "string") put(path, { source: text });
  }

  return pages;
}

export function applyFreshness(existing, payloads, today) {
  const previous = existing?.pages ?? {};
  const seeded = Object.keys(previous).length === 0;
  const pages = {};
  const urls = [];
  for (const [path, payload] of Object.entries(payloads)) {
    const hash = digest(payload);
    const prior = previous[path];
    if (!prior || prior.hash !== hash) {
      pages[path] = { changed: seeded ? "2026-10-24" : today, hash };
      if (!seeded) urls.push(`https://whichai.today${path === "/" ? "" : path}`);
    } else {
      pages[path] = prior;
    }
  }
  return { pages, urls };
}

async function readJson(url) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const models = JSON.parse(await readFile(new URL("lib/models.json", ROOT), "utf8"));
  const history = JSON.parse(await readFile(new URL("lib/history.json", ROOT), "utf8"));
  const providers = JSON.parse(await readFile(new URL("lib/providers.json", ROOT), "utf8"));
  const archive = (await readJson(new URL("lib/archive.json", ROOT))) ?? { models: [] };
  const held = (await readJson(new URL("lib/held.json", ROOT))) ?? { pages: [] };
  const tasks = await readJson(new URL("lib/tasks.json", ROOT));
  const files = {};
  for (const [path, relative] of Object.entries(STATIC_PAGES)) {
    try {
      files[path] = await readFile(new URL(relative, ROOT), "utf8");
    } catch {
      // The page does not exist yet.
    }
  }
  const payloads = buildPayloads({ models, history, providers, archive, tasks, files, held });
  const existing = (await readJson(FRESHNESS)) ?? { pages: {} };
  const today = (models.last_updated ?? new Date().toISOString()).slice(0, 10);
  const next = applyFreshness(existing, payloads, today);
  await writeFile(FRESHNESS, `${JSON.stringify({ pages: next.pages }, null, 2)}\n`);
  await writeFile(INDEXNOW, `${JSON.stringify(next.urls, null, 2)}\n`);
  console.log(`freshness: ${Object.keys(next.pages).length} pages, ${next.urls.length} changed`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function fixture() {
  const pick = (name, provider) => ({
    name,
    provider,
    why: "Because.",
    checked: "2026-10-24",
    primary_score: 10,
    cost: "$1",
  });
  return {
    models: {
      last_updated: "2026-10-24T12:00:00Z",
      categories: {
        coding: {
          slug: "coding",
          display_name: "Coding",
          primary_signal: "Board",
          sources: ["Board"],
          leader: pick("Alpha", "Anthropic"),
          runner_up: pick("Beta", "OpenAI"),
          open_source_pick: pick("Gamma", "Xiaomi"),
        },
      },
    },
    history: { entries: [] },
    providers: { Anthropic: { trains_by_default: "No." }, OpenAI: {}, Xiaomi: {} },
    archive: { models: [] },
    tasks: null,
    files: {},
    held: { pages: [] },
  };
}

function selfCheck() {
  const base = fixture();
  const first = buildPayloads(base);
  const seeded = applyFreshness({ pages: {} }, first, "2026-10-25");
  assert(seeded.pages["/coding"].changed === "2026-10-24", "a seed keeps the tracking date");
  assert(seeded.urls.length === 0, "a seed does not ping every page");

  const same = structuredClone(base);
  same.models.categories.coding.leader.checked = "2026-10-25";
  const checkedOnly = buildPayloads(same);
  assert(
    digest(first["/coding"]) === digest(checkedOnly["/coding"]),
    "a checked-only change should not move the page",
  );
  const stayed = applyFreshness({ pages: seeded.pages }, checkedOnly, "2026-10-25");
  assert(stayed.pages["/coding"].changed === "2026-10-24", "a checked-only change keeps the date");
  assert(stayed.urls.length === 0, "an empty change list sends no ping");

  const moved = structuredClone(base);
  moved.models.categories.coding.runner_up = {
    ...moved.models.categories.coding.runner_up,
    name: "Delta",
  };
  const next = buildPayloads(moved);
  const applied = applyFreshness({ pages: seeded.pages }, next, "2026-10-25");
  assert(applied.pages["/coding"].changed === "2026-10-25", "a new runner-up moves the category date");
  assert(applied.pages["/compare/alpha-vs-delta"], "a new runner-up moves the compare page");
  assert(applied.pages["/models/delta"], "a new runner-up moves the model page");
  assert(
    applied.urls.includes("https://whichai.today/coding") &&
      applied.urls.includes("https://whichai.today/compare/alpha-vs-delta") &&
      applied.urls.includes("https://whichai.today/models/delta"),
    "a new runner-up pings the category, compare, and model pages",
  );

  console.log("freshness self-check ok");
}

const isFreshness = process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/freshness.mjs");

if (isFreshness && process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

if (isFreshness) {
  await main();
}
