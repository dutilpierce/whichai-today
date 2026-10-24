import { readFile, writeFile } from "node:fs/promises";

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
      if (!pick.benchmark_context?.startsWith(signal)) {
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

export async function checkLinks(models, providers) {
  const urls = new Set();
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
  assert(signal.errors.some((error) => error.includes("does not start")), "evidence must start with the primary signal");

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

try {
  const posted = JSON.parse(await readFile(new URL("../changes-this-run.json", import.meta.url), "utf8"));
  if (Array.isArray(posted) && posted.some((entry) => !alertable(entry))) {
    result.errors.push("changes-this-run.json contains an entry that is not a confirmed change");
  }
} catch {
  // The file exists only after a refresh that confirmed a switch.
}

if (process.argv.includes("--links")) {
  const links = await checkLinks(models, providers);
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
