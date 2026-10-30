import { readFile, writeFile } from "node:fs/promises";

const APPS_FILE = new URL("../lib/apps.json", import.meta.url);
const MODELS_FILE = new URL("../lib/models.json", import.meta.url);
const GUIDES_FILE = new URL("../lib/prompt-guides.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const SKILLS = new Set(["Beginner", "Some setup", "Technical"]);
const CAPABILITIES = [
  "web_search",
  "file_upload",
  "image_generation",
  "video_generation",
  "presentations",
  "code_editing",
  "voice",
  "team_plan",
];

export const APP_SEEDS = [
  { slug: "chatgpt", name: "ChatGPT", maker: "OpenAI", link: "https://chatgpt.com" },
  { slug: "claude", name: "Claude", maker: "Anthropic", link: "https://claude.ai" },
  { slug: "gemini", name: "Gemini", maker: "Google", link: "https://gemini.google.com" },
  { slug: "copilot", name: "Microsoft Copilot", maker: "Microsoft", link: "https://copilot.microsoft.com" },
  { slug: "perplexity", name: "Perplexity", maker: "Perplexity", link: "https://www.perplexity.ai" },
  { slug: "cursor", name: "Cursor", maker: "Anysphere", link: "https://cursor.com" },
  { slug: "github-copilot", name: "GitHub Copilot", maker: "GitHub", link: "https://github.com/features/copilot" },
  { slug: "claude-code", name: "Claude Code", maker: "Anthropic", link: "https://claude.com/product/claude-code" },
  { slug: "codex", name: "Codex", maker: "OpenAI", link: "https://chatgpt.com/codex" },
  { slug: "midjourney", name: "Midjourney", maker: "Midjourney", link: "https://www.midjourney.com" },
  { slug: "canva", name: "Canva", maker: "Canva", link: "https://www.canva.com" },
  { slug: "hugging-face", name: "Hugging Face", maker: "Hugging Face", link: "https://huggingface.co" },
  { slug: "ollama", name: "Ollama", maker: "Ollama", link: "https://ollama.com" },
];

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function trackedNames(models) {
  const names = new Set();
  for (const category of Object.values(models.categories)) {
    for (const slot of ["leader", "runner_up", "open_source_pick"]) names.add(category[slot].name);
  }
  return names;
}

function jobLines(models) {
  return Object.values(models.categories)
    .map(
      (category) =>
        `- ${category.display_name}: #1 ${category.leader.name}, runner-up ${category.runner_up.name}, open-weights ${category.open_source_pick.name}`,
    )
    .join("\n");
}

/** Tracked names the apps were not researched against yet. A file with no list counts every name as new. */
export function newNames(names, previous) {
  const seen = new Set(previous?.tracked ?? []);
  return [...names].filter((name) => !seen.has(name));
}

/** Add the mappings a fresh answer found for new names to the stored app, and change nothing else. */
export function addMappings(stored, fresh, added) {
  const wanted = new Set(added);
  const plans = new Set((stored.plans ?? []).map((plan) => plan.name));
  const listed = new Set((stored.models ?? []).map((model) => model.name));
  const extra = (fresh.models ?? []).filter(
    (model) => wanted.has(model.name) && !listed.has(model.name) && plans.has(model.plan),
  );
  return extra.length ? { ...stored, models: [...stored.models, ...extra] } : stored;
}

export function validateApp(result, seed, today, names) {
  const app = {
    slug: seed.slug,
    name: seed.name,
    maker: seed.maker,
    link: seed.link,
    models: [],
    plans: [],
    skill: result?.skill,
    privacy: {
      trains_by_default: String(result?.privacy?.trains_by_default ?? "").trim(),
      opt_out: String(result?.privacy?.opt_out ?? "").trim(),
      source_url: String(result?.privacy?.source_url ?? "").trim(),
    },
    capabilities: {},
    checked: today,
  };
  if (!SKILLS.has(app.skill)) throw new Error(`${seed.slug} skill is invalid`);
  if (!app.privacy.trains_by_default || !app.privacy.opt_out) throw new Error(`${seed.slug} privacy is empty`);
  if (new URL(app.privacy.source_url).protocol !== "https:") throw new Error(`${seed.slug} privacy source is not https`);
  if (new URL(app.link).protocol !== "https:") throw new Error(`${seed.slug} link is not https`);

  for (const capability of CAPABILITIES) {
    if (typeof result?.capabilities?.[capability] !== "boolean") {
      throw new Error(`${seed.slug} ${capability} is not yes or no`);
    }
    app.capabilities[capability] = result.capabilities[capability];
  }

  for (const plan of result?.plans ?? []) {
    const name = String(plan?.name ?? "").trim();
    const freeTier = String(plan?.free_tier ?? "").trim();
    const source = String(plan?.source_url ?? "").trim();
    const price = plan?.price_usd_month;
    if (!name || !freeTier) throw new Error(`${seed.slug} has a plan with no name or free-tier note`);
    if (price !== null && (typeof price !== "number" || Number.isNaN(price) || price < 0)) {
      throw new Error(`${seed.slug} price must be a number or null`);
    }
    if (typeof price === "number" && !source) throw new Error(`${seed.slug} price has no source`);
    if (source && new URL(source).protocol !== "https:") throw new Error(`${seed.slug} plan source is not https`);
    app.plans.push({ name, price_usd_month: price, free_tier: freeTier, source_url: source });
  }
  if (!app.plans.length) throw new Error(`${seed.slug} has no plans`);

  const planNames = new Set(app.plans.map((plan) => plan.name));
  for (const model of result?.models ?? []) {
    const name = String(model?.name ?? "").trim();
    const plan = String(model?.plan ?? "").trim();
    if (!name || !plan) continue;
    if (!names.has(name)) throw new Error(`${seed.slug} lists ${name}, which is not a tracked model`);
    if (!planNames.has(plan)) {
      console.warn(`apps: ${seed.slug} dropped ${name}, its plan "${plan}" is not one of the plans`);
      continue;
    }
    if (!app.models.some((item) => item.name === name)) app.models.push({ name, plan });
  }
  return app;
}

function prompt(today, seed, names, jobs) {
  return `Today is ${today}. Look up the official pages for ${seed.name} by ${seed.maker} (${seed.link}).

Go through every tracked model below, including the image, video, and search models, and check whether ${seed.name} lets a user pick or use it. List each one it offers, with the cheapest plan that includes it. Leave out the ones it does not offer.

Tracked models by job:
${jobs}

Return ONLY JSON, no markdown:
{"models":[{"name":"one of the tracked names","plan":"the cheapest plan that includes it, spelled exactly as one of the plan names below"}],"plans":[{"name":"plan name","price_usd_month":20,"free_tier":"what a free plan includes and its notable limit, or none","source_url":"https official pricing page"}],"skill":"Beginner or Some setup or Technical","privacy":{"trains_by_default":"one sentence from the provider","opt_out":"where the switch is","source_url":"https official privacy page"},"capabilities":{"web_search":true,"file_upload":true,"image_generation":false,"video_generation":false,"presentations":false,"code_editing":false,"voice":false,"team_plan":true}}

Tracked model names, use none of the others: ${[...names].join(", ")}.
price_usd_month is the monthly USD price, 0 for a free plan, or null if it is not a flat monthly price. Do not invent a price. If you are not sure, use null and still give the source_url. Beginner means a chat website. Technical means an editor, CLI, or API. Some setup is in between. Capabilities are yes/no facts about the product, not wishes.`;
}

async function research(today, seed, names, jobs) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(today, seed, names, jobs) }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  return validateApp(extractJson(text), seed, today, names);
}

async function warnGuideLinks() {
  let guides;
  try {
    guides = JSON.parse(await readFile(GUIDES_FILE, "utf8"));
  } catch {
    return;
  }
  const urls = new Set();
  for (const guide of Object.values(guides.guides ?? guides)) {
    for (const tip of guide?.tips ?? []) if (tip.source_url) urls.add(tip.source_url);
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(20_000) });
      if (res.status >= 400) console.warn(`prompt guide ${url} returned ${res.status}`);
    } catch {
      console.warn(`prompt guide ${url} did not load`);
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  const names = new Set(["Alpha"]);
  const seed = APP_SEEDS[0];
  const good = validateApp(
    {
      skill: "Beginner",
      privacy: { trains_by_default: "On.", opt_out: "Settings.", source_url: "https://example.com/privacy" },
      capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, false])),
      models: [{ name: "Alpha", plan: "Plus" }],
      plans: [{ name: "Plus", price_usd_month: 20, free_tier: "Limited.", source_url: "https://example.com/pricing" }],
    },
    seed,
    "2026-10-25",
    names,
  );
  assert(good.models[0].name === "Alpha", "a tracked model should be kept");

  let priced = false;
  try {
    validateApp(
      {
        skill: "Beginner",
        privacy: { trains_by_default: "On.", opt_out: "Settings.", source_url: "https://example.com/privacy" },
        capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, false])),
        models: [],
        plans: [{ name: "Plus", price_usd_month: 20, free_tier: "Limited.", source_url: "" }],
      },
      seed,
      "2026-10-25",
      names,
    );
  } catch {
    priced = true;
  }
  assert(priced, "a price without a source should fail");

  let unknown = false;
  try {
    validateApp(
      {
        skill: "Beginner",
        privacy: { trains_by_default: "On.", opt_out: "Settings.", source_url: "https://example.com/privacy" },
        capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, false])),
        models: [{ name: "Missing", plan: "Plus" }],
        plans: [{ name: "Plus", price_usd_month: null, free_tier: "Limited.", source_url: "https://example.com/pricing" }],
      },
      seed,
      "2026-10-25",
      names,
    );
  } catch {
    unknown = true;
  }
  assert(unknown, "an untracked model should fail");

  const misplanned = validateApp(
    {
      skill: "Beginner",
      privacy: { trains_by_default: "On.", opt_out: "Settings.", source_url: "https://example.com/privacy" },
      capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, false])),
      models: [{ name: "Alpha", plan: "Ultra" }],
      plans: [{ name: "Plus", price_usd_month: 20, free_tier: "Limited.", source_url: "https://example.com/pricing" }],
    },
    seed,
    "2026-10-25",
    names,
  );
  assert(misplanned.models.length === 0, "a model on a plan the app does not have should be dropped");

  assert(newNames(new Set(["Alpha", "Beta"]), { tracked: ["Alpha"] }).join() === "Beta", "only untracked names are new");
  assert(newNames(new Set(["Alpha"]), {}).join() === "Alpha", "a file with no list treats every name as new");

  const stored = { slug: "demo", plans: [{ name: "Plus" }], models: [{ name: "Alpha", plan: "Plus" }], checked: "2026-10-01" };
  const merged = addMappings(
    stored,
    { models: [{ name: "Alpha", plan: "Pro" }, { name: "Beta", plan: "Plus" }, { name: "Gamma", plan: "Ultra" }] },
    ["Beta", "Gamma"],
  );
  assert(merged.models.map((model) => model.name).join() === "Alpha,Beta", "only new names on known plans are added");
  assert(merged.models[0].plan === "Plus" && merged.checked === "2026-10-01", "stored facts stay as they were");
  console.log("apps self-check ok");
}

async function main() {
  if (!API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const today = new Date().toISOString().slice(0, 10);
  const models = JSON.parse(await readFile(MODELS_FILE, "utf8"));
  const names = trackedNames(models);
  const jobs = jobLines(models);
  const previous = JSON.parse(await readFile(APPS_FILE, "utf8"));
  const kept = new Map((previous.apps ?? []).map((app) => [app.slug, app]));
  // --missing runs after each rankings refresh: it only adds apps for models that just became tracked.
  const missing = process.argv.includes("--missing");
  const added = newNames(names, previous);
  if (missing && !added.length) {
    console.log("apps: every tracked model was already researched");
    return;
  }
  if (missing) console.log(`apps: looking for ${added.join(", ")}`);
  const apps = [];
  let failed = false;
  for (const seed of APP_SEEDS) {
    try {
      const fresh = await research(today, seed, names, jobs);
      const stored = kept.get(seed.slug);
      apps.push(missing && stored ? addMappings(stored, fresh, added) : fresh);
      console.log(`apps: ${seed.slug} ${missing ? "checked" : "updated"}`);
    } catch (error) {
      failed = true;
      console.warn(`apps: ${seed.slug} kept previous (${error instanceof Error ? error.message : error})`);
      if (kept.has(seed.slug)) apps.push(kept.get(seed.slug));
    }
  }
  // A failed app keeps the old list, so the next run looks for the same names again.
  const tracked = failed ? (previous.tracked ?? []) : [...names].sort();
  await writeFile(APPS_FILE, `${JSON.stringify({ apps, tracked }, null, 2)}\n`);
  if (!missing) await warnGuideLinks();
  console.log(`apps: ${apps.length} written`);
}

const isMain = process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/refresh-apps.mjs");
if (isMain && process.argv.includes("--self-check")) {
  selfCheck();
} else if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
