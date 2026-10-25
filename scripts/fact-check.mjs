import { readFile, writeFile } from "node:fs/promises";
import { buildPayloads } from "./freshness.mjs";
import { checkPrompt } from "../lib/prompt-rules.mjs";

const MODELS = new URL("../lib/models.json", import.meta.url);
const HISTORY = new URL("../lib/history.json", import.meta.url);
const PROVIDERS = new URL("../lib/providers.json", import.meta.url);
const HELD = new URL("../lib/held.json", import.meta.url);
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const FRESH_DAYS = 45;

export function numbersIn(value) {
  return value.match(/\d+(?:\.\d+)?/g) ?? [];
}

export function alertable(entry) {
  return entry?.type === "change" && Boolean(entry.previous);
}

export function checkTasks(tasks, models, providers) {
  const errors = [];
  const seen = new Set();
  const slots = ["leader", "runner_up", "open_source_pick"];
  for (const task of tasks?.tasks ?? []) {
    if (seen.has(task.slug)) errors.push(`duplicate task ${task.slug}`);
    seen.add(task.slug);
    const category = Object.values(models.categories).find((item) => item.slug === task.category);
    if (!category) errors.push(`${task.slug} does not match a category`);
    for (const field of ["title", "tip", "starter_prompt", "caution", "measured"]) {
      if (typeof task[field] !== "string" || !task[field].trim()) errors.push(`${task.slug} ${field} is empty`);
      else if (numbersIn(task[field]).length) errors.push(`${task.slug} ${field} cites a number`);
    }
    if (category && /client|contract|confidential|paste/i.test(task.caution ?? "")) {
      const trains = slots.some((slot) => {
        const text = providers[category[slot].provider]?.trains_by_default ?? "";
        return /by default|can be used|prompts and files|user input/i.test(text);
      });
      if (!trains) errors.push(`${task.slug} warns about private files, but no pick's provider trains by default`);
    }
  }
  return errors;
}

export function checkFreshness(paths, freshness, today) {
  const errors = [];
  for (const path of paths) {
    const changed = freshness?.pages?.[path]?.changed;
    if (!changed || !/^\d{4}-\d{2}-\d{2}$/.test(changed)) errors.push(`${path} has no freshness date`);
    else if (changed > today) errors.push(`${path} freshness date is in the future`);
  }
  return errors;
}

export function latestEntry(history, key) {
  return history.entries
    .map((entry, index) => ({ entry, index }))
    .filter((item) => item.entry.category === key)
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.index - b.index)
    .at(-1)?.entry ?? null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function daysSince(value, today) {
  const start = new Date(`${value.slice(0, 10)}T12:00:00Z`).getTime();
  const end = new Date(`${today}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

export function checkData(models, history, providers, today) {
  const errors = [];
  const facts = [];
  const pages = [];

  function fail(message, fact) {
    errors.push(message);
    if (fact) facts.push({ ...fact, reason: message });
  }

  for (const [provider, privacy] of Object.entries(providers)) {
    if (!privacy.source_url) fail(`${provider} privacy has no source`, { kind: "privacy", provider });
    if (!privacy.checked || daysSince(privacy.checked, today) > FRESH_DAYS) {
      fail(`${provider} privacy is older than ${FRESH_DAYS} days`, { kind: "privacy", provider });
    }
  }

  for (const [key, category] of Object.entries(models.categories)) {
    const signal = category.primary_signal;
    for (const slot of SLOTS) {
      const pick = category[slot];
      if (!pick.source_url) fail(`${key}.${slot} has no source`, { kind: "cost", model: pick.name });
      if (!pick.checked || daysSince(pick.checked, today) > FRESH_DAYS) {
        fail(`${key}.${slot} cost and free tier are older than ${FRESH_DAYS} days`, { kind: "cost", model: pick.name });
      }
      if (/not cited/i.test(pick.benchmark_context ?? "")) {
        fail(`${key}.${slot} evidence says a board was not cited`, { kind: "cost", model: pick.name });
      }
      if (slot === "leader" && !pick.benchmark_context?.startsWith(signal)) {
        fail(`${key}.${slot} evidence does not start with ${signal}`, { kind: "cost", model: pick.name });
      }
      if (Array.isArray(category.sources) && category.sources.length && pick.sources_checked > category.sources.length) {
        fail(`${key}.${slot} sources_checked is larger than the source list`, { kind: "cost", model: pick.name });
      }
      const evidence = `${pick.benchmark_context ?? ""} ${pick.cost ?? ""}`;
      for (const number of numbersIn(pick.why ?? "")) {
        if (!evidence.includes(number)) {
          fail(`${key}.${slot} why cites ${number}, which is not in the stored evidence`, { kind: "cost", model: pick.name });
        }
      }
    }
    const leaderScore = category.leader.primary_score;
    const runnerScore = category.runner_up.primary_score;
    if (leaderScore !== null && runnerScore !== null && runnerScore > leaderScore) {
      fail(`${key} runner-up scores higher than the leader on ${signal}`, { kind: "cost", model: category.leader.name });
      pages.push(`/${category.slug}`);
      pages.push(`/compare/${slugify(category.leader.name)}-vs-${slugify(category.runner_up.name)}`);
    }
    const latest = latestEntry(history, key);
    if (!latest || latest.leader !== category.leader.name) {
      fail(`${key} history does not name the current leader`, { kind: "cost", model: category.leader.name });
    }
  }

  return { errors, facts, pages: [...new Set(pages)] };
}

export function checkApps(apps, models, today) {
  const errors = [];
  const known = new Set();
  for (const category of Object.values(models.categories ?? {})) {
    for (const slot of SLOTS) known.add(category[slot]?.name);
  }
  const seen = new Set();
  for (const app of apps?.apps ?? []) {
    const slug = app?.slug || "app";
    if (!app?.slug || seen.has(app.slug)) errors.push(`${slug} is missing or duplicated`);
    seen.add(app.slug);
    if (!app.checked || daysSince(app.checked, today) > FRESH_DAYS) {
      errors.push(`${slug} was last checked more than ${FRESH_DAYS} days ago`);
    }
    if (!["Beginner", "Some setup", "Technical"].includes(app.skill)) errors.push(`${slug} skill is invalid`);
    for (const plan of app.plans ?? []) {
      if (typeof plan.price_usd_month === "number" && !plan.source_url) {
        errors.push(`${slug} price has no source`);
      }
    }
    if (app.privacy && !app.privacy.source_url) errors.push(`${slug} privacy has no source`);
    for (const model of app.models ?? []) {
      if (!known.has(model.name)) errors.push(`${slug} lists ${model.name}, which is not a tracked model`);
    }
  }
  return errors;
}

async function checkLink(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "WhichAI-fact-check" },
    });
    if (res.status === 403 || res.status === 429) return { warn: `${url} returned ${res.status}` };
    if (res.status === 404 || res.status === 410 || res.status >= 400) return { fail: `${url} returned ${res.status}` };
    return {};
  } catch (error) {
    const message = error?.cause?.code === "ENOTFOUND" ? "could not be found" : "did not load";
    return { fail: `${url} ${message}` };
  }
}

export async function checkLinks(models, providers, apps = { apps: [] }) {
  const urls = new Set();
  for (const app of apps.apps ?? []) {
    if (app.link) urls.add(app.link);
    if (app.privacy?.source_url) urls.add(app.privacy.source_url);
    for (const plan of app.plans ?? []) if (plan.source_url) urls.add(plan.source_url);
  }
  for (const privacy of Object.values(providers)) {
    if (privacy.source_url) urls.add(privacy.source_url);
  }
  for (const category of Object.values(models.categories)) {
    for (const slot of SLOTS) {
      const pick = category[slot];
      if (pick.source_url) urls.add(pick.source_url);
      if (pick.direct_link) urls.add(pick.direct_link);
    }
  }
  const errors = [];
  const warnings = [];
  for (const url of urls) {
    const result = await checkLink(url);
    if (result.fail) errors.push(result.fail);
    if (result.warn) warnings.push(result.warn);
  }
  return { errors, warnings };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  const today = "2026-10-24";
  const providers = {
    Test: { trains_by_default: "No.", opt_out: "Off.", source_url: "https://example.com", checked: today },
  };
  const pick = (name, score, why = "Because.") => ({
    name,
    why,
    benchmark_context: "Board 1",
    cost: "$1",
    source_url: "https://example.com/board",
    direct_link: "https://example.com",
    checked: today,
    primary_score: score,
  });
  const models = {
    categories: {
      coding: {
        slug: "coding",
        primary_signal: "Board",
        leader: pick("Alpha", 2),
        runner_up: pick("Beta", 1),
        open_source_pick: pick("Gamma", null),
      },
    },
  };
  const history = { entries: [{ category: "coding", leader: "Alpha", previous: null, date: today, evidence: "Board 1" }] };
  const ok = checkData(models, history, providers, today);
  assert(ok.errors.length === 0, `clean data should pass: ${ok.errors.join("; ")}`);

  const missing = checkData(models, history, { Test: { ...providers.Test, source_url: "" } }, today);
  assert(missing.errors.some((error) => error.includes("no source")), "missing privacy source should fail");

  const drifted = structuredClone(models);
  drifted.categories.coding.leader.why = "It scored 99.";
  const drift = checkData(drifted, history, providers, today);
  assert(drift.errors.some((error) => error.includes("99")), "a number missing from the evidence should fail");

  const beaten = structuredClone(models);
  beaten.categories.coding.runner_up.primary_score = 9;
  const beat = checkData(beaten, history, providers, today);
  assert(beat.errors.some((error) => error.includes("scores higher")), "a higher runner-up score should fail");
  assert(beat.pages.includes("/coding"), "a contradiction should hold the category page");

  const wrong = structuredClone(models);
  wrong.categories.coding.leader.benchmark_context = "Other board 1";
  const signal = checkData(wrong, history, providers, today);
  assert(signal.errors.some((error) => error.includes("does not start")), "leader evidence must start with the primary signal");

  const otherEvidence = structuredClone(models);
  otherEvidence.categories.coding.runner_up.benchmark_context = "88.2% on SWE-bench Pro.";
  const allowed = checkData(otherEvidence, history, providers, today);
  assert(allowed.errors.length === 0, "an alternative may cite evidence other than the primary signal");

  const uncited = structuredClone(models);
  uncited.categories.coding.open_source_pick.benchmark_context = "Board not cited. Score 1.";
  const missingCite = checkData(uncited, history, providers, today);
  assert(missingCite.errors.some((error) => error.includes("not cited")), "not cited is not evidence");

  const stale = structuredClone(models);
  stale.categories.coding.leader.checked = "2026-01-01";
  const old = checkData(stale, history, providers, today);
  assert(old.errors.some((error) => error.includes("older than")), "stale cost facts should fail");

  assert(alertable({ type: "change", previous: "Other" }) === true, "a real change is alertable");
  assert(alertable({ type: "methodology", previous: "Other" }) === false, "a methodology entry is not alertable");

  const tooMany = structuredClone(models);
  tooMany.categories.coding.sources = ["LMArena Code"];
  tooMany.categories.coding.leader.sources_checked = 4;
  const counted = checkData(tooMany, history, providers, today);
  assert(counted.errors.some((error) => error.includes("source list")), "sources_checked cannot exceed the list");

  assert(checkFreshness(["/coding"], { pages: {} }, "2026-10-24").some((error) => error.includes("no freshness")), "a missing freshness date should fail");
  assert(
    checkFreshness(["/coding"], { pages: { "/coding": { changed: "2026-12-01" } } }, "2026-10-24").some((error) => error.includes("future")),
    "a future freshness date should fail",
  );
  assert(
    checkTasks(
      { tasks: [{ slug: "demo", title: "demo", category: "missing", tip: "Tip.", starter_prompt: "Prompt.", caution: "Careful.", measured: "Measured." }] },
      models,
      providers,
    ).some((error) => error.includes("does not match")),
    "a task must match a real category",
  );

  const promptOpts = {
    query: "Fix the bug",
    target: "Alpha",
    targetProvider: "Test",
    names: ["Beta", "Alpha"],
    providers: ["OpenAI", "Test"],
    boards: ["LMArena Code"],
  };
  const sample = [
    "Role: Helper",
    "Task: Fix the bug",
    "Context: [file]",
    "Output format: a patch",
    "Tone: Plain and direct.",
    "Constraints: Show the smallest change.",
  ].join("\n");
  assert(checkPrompt(sample, promptOpts).length === 0, `a plain prompt should pass: ${checkPrompt(sample, promptOpts).join("; ")}`);
  assert(checkPrompt(`${sample}\nIt costs $20.`, promptOpts).some((error) => error.includes("price")), "a price should fail");
  assert(checkPrompt(sample.replace("Helper", "Use Beta"), promptOpts).some((error) => error.includes("Beta")), "another model should fail");
  assert(checkPrompt(`${sample}\nScore 99.`, promptOpts).some((error) => error.includes("99")), "a number outside the request should fail");
  assert(checkPrompt("Here is the finished essay.", promptOpts).some((error) => error.includes("not instructions")), "content is not a prompt");
  assert(checkPrompt(`${sample}\n1. Read it.\n2. Fix it.`, promptOpts).length === 0, "step numbers are allowed");

  const staleApp = checkApps(
    {
      apps: [
        {
          slug: "demo",
          skill: "Beginner",
          checked: "2026-01-01",
          plans: [{ name: "Plus", price_usd_month: 20, source_url: "" }],
          models: [{ name: "Nope", plan: "Plus" }],
          privacy: { source_url: "" },
        },
      ],
    },
    models,
    today,
  );
  assert(staleApp.some((error) => error.includes("last checked")), "a stale app should fail");
  assert(staleApp.some((error) => error.includes("no source")), "an app price needs a source");
  assert(staleApp.some((error) => error.includes("not a tracked model")), "an app model must be tracked");
  assert(checkApps({ apps: [] }, models, today).length === 0, "an empty app list should pass");

  console.log("fact-check self-check ok");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const models = JSON.parse(await readFile(MODELS, "utf8"));
const history = JSON.parse(await readFile(HISTORY, "utf8"));
const providers = JSON.parse(await readFile(PROVIDERS, "utf8"));
const result = checkData(models, history, providers, today);
let apps = { apps: [] };
try {
  apps = JSON.parse(await readFile(new URL("../lib/apps.json", import.meta.url), "utf8"));
} catch {
  apps = { apps: [] };
}
result.errors.push(...checkApps(apps, models, today));

try {
  const freshness = JSON.parse(await readFile(new URL("../lib/freshness.json", import.meta.url), "utf8"));
  const archive = JSON.parse(await readFile(new URL("../lib/archive.json", import.meta.url), "utf8"));
  const held = JSON.parse(await readFile(HELD, "utf8"));
  let tasks = null;
  try {
    tasks = JSON.parse(await readFile(new URL("../lib/tasks.json", import.meta.url), "utf8"));
  } catch {
    tasks = null;
  }
  const files = {};
  for (const [path, relative] of Object.entries({
    "/about": "../app/about/page.tsx",
    "/privacy": "../app/privacy/page.tsx",
    "/alerts": "../app/alerts/page.tsx",
    "/methodology": "../app/methodology/page.tsx",
    "/embed": "../app/embed/page.tsx",
    "/data": "../app/data/page.tsx",
  })) {
    try {
      files[path] = await readFile(new URL(relative, import.meta.url), "utf8");
    } catch {
      // The page does not exist yet.
    }
  }
  const payloads = buildPayloads({ models, history, providers, archive, tasks, files, held });
  result.errors.push(...checkFreshness(Object.keys(payloads), freshness, today));
  if (tasks) result.errors.push(...checkTasks(tasks, models, providers));
} catch (error) {
  result.errors.push(error instanceof Error ? error.message : "freshness.json is missing");
}

try {
  const posted = JSON.parse(await readFile(new URL("../changes-this-run.json", import.meta.url), "utf8"));
  if (Array.isArray(posted) && posted.some((entry) => !alertable(entry))) {
    result.errors.push("changes-this-run.json contains an entry that is not a confirmed change");
  }
} catch {
  // The file exists only after a refresh that confirmed a switch.
}

if (process.argv.includes("--links")) {
  const links = await checkLinks(models, providers, apps);
  result.errors.push(...links.errors);
  for (const warning of links.warnings) console.warn(`warning: ${warning}`);
}

if (process.argv.includes("--hold")) {
  await writeFile(HELD, `${JSON.stringify({ pages: result.pages, facts: result.facts }, null, 2)}\n`);
}

if (result.errors.length) {
  for (const error of result.errors) console.error(error);
  process.exit(1);
}

console.log("fact-check ok");
