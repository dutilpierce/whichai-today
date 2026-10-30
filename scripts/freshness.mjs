import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const FRESHNESS = new URL("../lib/freshness.json", import.meta.url);
const INDEXNOW = new URL("../indexnow-urls.json", import.meta.url);
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const STATIC_PAGES = {
  "/about": "app/about/page.tsx",
  "/faq": "app/faq/page.tsx",
  "/privacy": "app/privacy/page.tsx",
  "/alerts": "app/alerts/page.tsx",
  "/methodology": "app/methodology/page.tsx",
  "/embed": "app/embed/page.tsx",
  "/data": "app/data/page.tsx",
  "/free": "app/free/page.tsx",
  "/prompt-builder": "app/prompt-builder/page.tsx",
  "/suggest": "app/suggest/page.tsx",
  "/which-ai-should-i-use": "app/which-ai-should-i-use/page.tsx",
  "/pick": "app/pick/page.tsx",
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

const PAIRS = [
  ["chatgpt", "claude", "chatgpt-vs-claude"],
  ["claude", "gemini", "claude-vs-gemini"],
  ["chatgpt", "gemini", "chatgpt-vs-gemini"],
  ["perplexity", "chatgpt", "perplexity-vs-chatgpt"],
  ["copilot", "chatgpt", "copilot-vs-chatgpt"],
  ["cursor", "github-copilot", "cursor-vs-github-copilot"],
];

function visibleRelease(entry) {
  const next = { ...entry };
  delete next.evidence;
  return next;
}

export function buildPayloads({ models, history, providers, archive, tasks, files, held, guides, audiences, picker, apps, releases, site }) {
  const skip = new Set(held?.pages ?? []);
  const pages = {};
  const categories = Object.values(models.categories);

  function put(path, payload) {
    if (!skip.has(path)) pages[path] = payload;
  }

  const releaseEntries = (releases?.entries ?? []).map(visibleRelease);
  put("/", {
    categories: categories.map((category) => ({
      slug: category.slug,
      leader: visiblePick(category.leader),
      runner_up: visiblePick(category.runner_up),
      open_source_pick: visiblePick(category.open_source_pick),
    })),
    releases: releaseEntries.slice(0, 8),
  });
  put("/releases", releaseEntries);

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

  // Mirrors lib/pair-slugs.ts and lib/compare.ts: same-kind pairs, alphabetical slug, indexed pairs only.
  const MEDIA = { images: "image", video: "video" };
  const kinds = new Map();
  for (const category of categories) {
    for (const slot of SLOTS) {
      const slug = slugify(category[slot].name);
      kinds.set(slug, new Set([...(kinds.get(slug) ?? []), MEDIA[category.slug] ?? "text"]));
    }
  }
  const modality = (slug) => (kinds.get(slug).size === 1 ? [...kinds.get(slug)][0] : "text");
  const popular = new Set(
    categories.map((category) => [slugify(category.leader.name), slugify(category.runner_up.name)].sort().join("-vs-")),
  );
  const tracked = [...kinds.keys()].sort();
  const headToHeads = [];
  for (let i = 0; i < tracked.length; i++) {
    for (let j = i + 1; j < tracked.length; j++) {
      const [left, right] = [tracked[i], tracked[j]];
      if (modality(left) !== modality(right)) continue;
      const a = byModel.get(left);
      const b = byModel.get(right);
      const shared = a.slots.some((item) => b.slots.some((other) => other.category === item.category));
      if (!shared) continue;
      const pair = `${left}-vs-${right}`;
      headToHeads.push(pair);
      if (site?.compare_index !== "shared" && !popular.has(pair)) continue;
      put(`/compare/${pair}`, {
        a: { ...a, privacy: providers[a.provider] ?? null },
        b: { ...b, privacy: providers[b.provider] ?? null },
        released: releaseEntries.filter((entry) => [left, right].includes(slugify(entry.name))).map((entry) => entry.id),
      });
    }
  }
  put("/compare", headToHeads);

  for (const entry of releaseEntries) {
    if (byModel.get(slugify(entry.name))?.slots.length) put(`/releases/${entry.id}`, entry);
  }

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

  for (const [slug, guide] of Object.entries(guides?.guides ?? {})) {
    const leads = Object.values(models.categories)
      .filter((category) => category.leader?.provider === guide.provider)
      .map((category) => category.slug);
    put(`/prompts/${slug}`, { tips: guide.tips, tasks: guide.tasks, provider: guide.provider, leads });
  }

  for (const [path, text] of Object.entries(files ?? {})) {
    if (typeof text !== "string") continue;
    if (path === "/faq") {
      put(path, {
        source: text,
        picks: categories.map((category) => ({
          leader: category.leader?.name,
          alternative: category.runner_up?.name,
          open: category.open_source_pick?.name,
          provider: category.leader?.provider,
          checked: category.leader?.checked,
          why: category.leader?.why,
        })),
        providers,
        history: history?.entries ?? [],
        plans: (apps?.apps ?? []).map((app) => ({ slug: app.slug, plans: app.plans })),
      });
      continue;
    }
    put(path, { source: text });
  }

  for (const audience of audiences?.audiences ?? []) put(`/for/${audience.slug}`, audience);
  for (const topic of picker?.topics ?? []) put(`/pick/${topic.slug}`, topic);

  const appSlugs = new Set((apps?.apps ?? []).map((app) => app.slug));
  for (const app of apps?.apps ?? []) {
    put(`/apps/${app.slug}`, {
      plans: app.plans,
      privacy: app.privacy,
      capabilities: app.capabilities,
      models: app.models,
      checked: app.checked,
    });
  }
  for (const [left, right, slug] of PAIRS) {
    if (appSlugs.has(left) && appSlugs.has(right)) put(`/vs/${slug}`, { left, right });
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
  let guides = null;
  try {
    guides = JSON.parse(await readFile(new URL("lib/prompt-guides.json", ROOT), "utf8"));
  } catch {
    guides = null;
  }
  const audiences = await readJson(new URL("lib/audiences.json", ROOT));
  const picker = await readJson(new URL("lib/picker.json", ROOT));
  const apps = (await readJson(new URL("lib/apps.json", ROOT))) ?? { apps: [] };
  const releases = (await readJson(new URL("lib/releases.json", ROOT))) ?? { entries: [] };
  const site = await readJson(new URL("lib/site.json", ROOT));
  const payloads = buildPayloads({ models, history, providers, archive, tasks, files, held, guides, audiences, picker, apps, releases, site });
  const existing = (await readJson(FRESHNESS)) ?? { pages: {} };
  const today = [models.last_updated, releases.last_checked]
    .filter(Boolean)
    .map((value) => value.slice(0, 10))
    .sort()
    .at(-1) ?? new Date().toISOString().slice(0, 10);
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
    releases: { entries: [] },
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
  assert(!applied.pages["/compare/delta-vs-alpha"], "a pair has one page, in alphabetical order");
  assert(!applied.pages["/compare/alpha-vs-gamma"], "only today's #1 against the alternative is listed by default");
  const wide = buildPayloads({ ...moved, site: { compare_index: "shared" } });
  assert(wide["/compare/alpha-vs-gamma"], "compare_index shared lists every head-to-head");
  assert(applied.pages["/models/delta"], "a new runner-up moves the model page");
  assert(
    applied.urls.includes("https://whichai.today/coding") &&
      applied.urls.includes("https://whichai.today/compare/alpha-vs-delta") &&
      applied.urls.includes("https://whichai.today/models/delta"),
    "a new runner-up pings the category, compare, and model pages",
  );

  const released = structuredClone(base);
  released.releases.entries.push({ id: "2026-10-25-test-alpha-2", name: "Alpha 2", evidence: "Quote." });
  const withRelease = applyFreshness({ pages: seeded.pages }, buildPayloads(released), "2026-10-25");
  assert(withRelease.pages["/"].changed === "2026-10-25", "a new release moves the home page");
  assert(withRelease.pages["/releases"].changed === "2026-10-25", "a new release moves the releases page");
  assert(!withRelease.pages["/releases/2026-10-25-test-alpha-2"], "a release of a model we don't rank gets no listed page");
  const rankedRelease = structuredClone(base);
  rankedRelease.releases.entries.push({ id: "2026-10-25-test-alpha", name: "Alpha", evidence: "Quote." });
  const withRanked = applyFreshness({ pages: seeded.pages }, buildPayloads(rankedRelease), "2026-10-25");
  assert(withRanked.urls.includes("https://whichai.today/releases/2026-10-25-test-alpha"), "a release of a ranked model pings its own page");
  const evidenceOnly = structuredClone(released);
  evidenceOnly.releases.entries[0].evidence = "Another quote.";
  assert(
    digest(buildPayloads(released)["/releases"]) === digest(buildPayloads(evidenceOnly)["/releases"]),
    "release evidence is not shown, so it should not move the page",
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
