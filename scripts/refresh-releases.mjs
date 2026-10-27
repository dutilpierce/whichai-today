import { readFile, writeFile } from "node:fs/promises";

const RELEASES_FILE = new URL("../lib/releases.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const FIELDS = ["date", "name", "provider", "kind", "status", "summary", "evidence", "source_url"];
const KINDS = new Set(["model", "update", "feature", "open_weights"]);
const STATUSES = new Set(["available", "preview", "announced"]);
const MAX_LENGTH = {
  date: 10,
  name: 60,
  provider: 40,
  kind: 20,
  status: 20,
  summary: 200,
  evidence: 300,
  source_url: 300,
};
const MAX_FEATURES = 4;
const FEATURE_LENGTH = 24;
const MAX_AGE_DAYS = 14;
const RECENT_IN_PROMPT = 40;

export function numbersIn(value) {
  return value.match(/\d+(?:\.\d+)?/g) ?? [];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function releaseKey(entry) {
  return `${slugify(entry.provider)}|${slugify(entry.name)}`;
}

export function releaseId(entry) {
  return `${entry.date}-${slugify(entry.provider)}-${slugify(entry.name)}`;
}

function daysBetween(from, to) {
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

function prompt(today, recent, days) {
  return `Today is ${today}. You maintain the "Latest AI releases" timeline on WhichAI.today. It lists what AI companies shipped, in date order. It is not a ranking.

Search the web for official AI releases from the last ${days} days. Count:
- new AI models and new versions of existing models (text, image, video, audio, embeddings)
- new open-weights models
- major features or launches in well-known AI apps and APIs (for example a new agent mode, memory, a new plan, or a much larger context window)

Skip rumors, leaks, benchmarks alone, funding news, minor bug fixes, and anything without an official announcement from the company itself (its blog, newsroom, docs changelog, or model card). Use the company's own page as source_url, not a news article. Copy source_url exactly from a search result you actually found. Never build or guess a URL from the product name; leave the release out if you cannot find its official page.

Already listed, do not repeat these:
${recent.length ? recent.map((entry) => `- ${entry.provider}: ${entry.name} (${entry.date})`).join("\n") : "- nothing yet"}

Return ONLY a JSON object, with no markdown, shaped exactly like:
{"entries": [E, ...]}
where each E is:
{"date":"YYYY-MM-DD the company announced it","name":"product or model name","provider":"company","kind":"model or update or feature or open_weights","status":"available or preview or announced","summary":"one plain-English sentence under 25 words on what is new","features":["1 to 4 short tags under 24 characters, like Vision, Reasoning, 1M context, Open weights"],"evidence":"a short quote or close paraphrase from source_url that backs every number in summary and features","source_url":"https URL of the official announcement"}

Use kind "model" for a new model family or a new major model, "update" for a new version or upgrade of an existing model, "feature" for an app or API feature, and "open_weights" for a model whose weights can be downloaded. Use status "available" only if people can use it today. Return {"entries": []} if nothing qualifies.`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

export function validateEntry(raw, today, maxAge = MAX_AGE_DAYS) {
  if (!raw || typeof raw !== "object") throw new Error("entry is not an object");
  const next = {};
  for (const field of FIELDS) {
    const value = raw[field];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is empty`);
    if (value.length > MAX_LENGTH[field]) throw new Error(`${field} is too long`);
    next[field] = value.trim();
  }
  const label = `${next.provider} ${next.name}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || Number.isNaN(Date.parse(next.date))) {
    throw new Error(`${label} date is invalid`);
  }
  if (next.date > today) throw new Error(`${label} date is in the future`);
  if (daysBetween(next.date, today) > maxAge) throw new Error(`${label} is older than ${maxAge} days`);
  if (!KINDS.has(next.kind)) throw new Error(`${label} kind is invalid`);
  if (!STATUSES.has(next.status)) throw new Error(`${label} status is invalid`);
  if (new URL(next.source_url).protocol !== "https:") throw new Error(`${label} source_url is not https`);
  const features = Array.isArray(raw.features) ? raw.features : [];
  next.features = [];
  for (const feature of features) {
    if (typeof feature !== "string" || !feature.trim()) continue;
    if (feature.trim().length > FEATURE_LENGTH) throw new Error(`${label} feature "${feature}" is too long`);
    if (!next.features.some((item) => item.toLowerCase() === feature.trim().toLowerCase())) next.features.push(feature.trim());
  }
  if (!next.features.length) throw new Error(`${label} has no features`);
  if (next.features.length > MAX_FEATURES) next.features = next.features.slice(0, MAX_FEATURES);
  for (const number of numbersIn(`${next.summary} ${next.features.join(" ")}`)) {
    if (numbersIn(next.name).includes(number)) continue;
    if (!next.evidence.includes(number)) throw new Error(`${label} cites ${number}, which is not in the evidence`);
  }
  return next;
}

export function mergeReleases(existing, incoming, today) {
  const entries = [...existing.entries];
  const keys = new Set(entries.map(releaseKey));
  const ids = new Set(entries.map((entry) => entry.id));
  const added = [];
  for (const entry of incoming) {
    const key = releaseKey(entry);
    if (keys.has(key)) continue;
    let id = releaseId(entry);
    for (let n = 2; ids.has(id); n++) id = `${releaseId(entry)}-${n}`;
    const next = {
      id,
      date: entry.date,
      added: today,
      name: entry.name,
      provider: entry.provider,
      kind: entry.kind,
      status: entry.status,
      summary: entry.summary,
      features: entry.features,
      evidence: entry.evidence,
      source_url: entry.source_url,
    };
    keys.add(key);
    ids.add(id);
    entries.push(next);
    added.push(next);
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.added.localeCompare(a.added) || a.id.localeCompare(b.id));
  return { entries, added };
}

const LINK_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// A missing page means the URL was guessed. Hosts that block bots (403, 429) or time out get the benefit of the doubt.
export function deadLink(status, code) {
  if (code === "ENOTFOUND") return true;
  if (status === 403 || status === 429) return false;
  return typeof status === "number" && status >= 400;
}

async function sourceIsDead(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": LINK_AGENT },
    });
    return deadLink(res.status);
  } catch (error) {
    return deadLink(undefined, error?.cause?.code || error?.code);
  }
}

async function research(today, recent, days) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(today, recent, days) }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(180_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  const result = extractJson(text);
  if (!Array.isArray(result?.entries)) throw new Error("entries is not a list");
  return result.entries;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  const today = "2026-10-27";
  const raw = (overrides = {}) => ({
    date: "2026-10-26",
    name: "Alpha 2",
    provider: "Test Labs",
    kind: "model",
    status: "available",
    summary: "Alpha 2 reads images and handles a 1M token context.",
    features: ["Vision", "1M context"],
    evidence: "Alpha 2 supports images and a context window of 1M tokens.",
    source_url: "https://example.com/blog/alpha-2",
    ...overrides,
  });

  const clean = validateEntry(raw(), today);
  assert(clean.features.length === 2, "a clean entry should keep its features");

  function rejects(overrides, message) {
    let failed = false;
    try {
      validateEntry(raw(overrides), today);
    } catch {
      failed = true;
    }
    assert(failed, message);
  }
  rejects({ date: "2026-10-28" }, "a future date should fail");
  rejects({ date: "2026-09-01" }, "an old date should fail");
  rejects({ kind: "rumor" }, "an unknown kind should fail");
  rejects({ status: "soon" }, "an unknown status should fail");
  rejects({ source_url: "http://example.com" }, "a non-https source should fail");
  rejects({ summary: "Alpha 2 is 40% faster." }, "a number missing from the evidence should fail");
  rejects({ features: ["3M context"] },"a feature number missing from the evidence should fail");
  rejects({ features: [] }, "an entry needs at least one feature");
  rejects({ features: ["A feature name that is far too long"] }, "a long feature should fail");
  rejects({ summary: "" }, "an empty summary should fail");
  assert(deadLink(404) && deadLink(410) && deadLink(500), "a missing page is a dead link");
  assert(!deadLink(200) && !deadLink(403) && !deadLink(429), "a blocked host is not a dead link");
  assert(deadLink(undefined, "ENOTFOUND") && !deadLink(undefined, "ETIMEDOUT"), "a missing domain is dead, a timeout is not");
  assert(validateEntry(raw({ date: "2026-09-01" }), today, 60).date === "2026-09-01", "a backfill window should allow older entries");
  assert(
    validateEntry(raw({ features: ["Vision", "Reasoning", "Tools", "Voice", "Video"] }), today).features.length === 4,
    "features should be capped at four",
  );

  const first = mergeReleases({ entries: [] }, [clean], today);
  assert(first.added.length === 1 && first.entries[0].id === "2026-10-26-test-labs-alpha-2", "a new entry gets a stable id");
  assert(first.entries[0].added === today, "a new entry records when it was added");

  const again = mergeReleases({ entries: first.entries }, [{ ...clean, name: "alpha 2 ", date: "2026-10-27" }], "2026-10-28");
  assert(again.added.length === 0 && again.entries.length === 1, "the same provider and name should not repeat");
  assert(again.entries[0].added === today, "an existing entry is never overwritten");

  const newer = validateEntry(raw({ name: "Beta", date: "2026-10-27", summary: "Beta adds voice.", features: ["Voice"] }), today);
  const older = validateEntry(raw({ name: "Gamma", date: "2026-10-20", summary: "Gamma adds tools.", features: ["Tools"] }), today);
  const sorted = mergeReleases({ entries: first.entries }, [older, newer], today);
  assert(
    sorted.entries.map((entry) => entry.name).join(",") === "Beta,Alpha 2,Gamma",
    "entries should be newest first",
  );

  console.log("refresh-releases self-check ok");
}

const isMain = process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/refresh-releases.mjs");

if (isMain && process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

if (isMain) {
  if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const sinceIndex = process.argv.indexOf("--since");
  const days = sinceIndex === -1 ? 7 : Number(process.argv[sinceIndex + 1]);
  if (!Number.isInteger(days) || days < 1 || days > 120) {
    console.error("--since needs a whole number of days from 1 to 120.");
    process.exit(1);
  }
  const maxAge = Math.max(MAX_AGE_DAYS, days);

  const releases = JSON.parse(await readFile(RELEASES_FILE, "utf8").catch(() => '{"last_checked":null,"entries":[]}'));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const recent = releases.entries.slice(0, Math.max(RECENT_IN_PROMPT, days * 2));

  let raw = null;
  for (let attempt = 1; attempt <= 2 && !raw; attempt++) {
    try {
      raw = await research(today, recent, days);
    } catch (error) {
      console.error(`attempt ${attempt} failed: ${error.message}`);
    }
  }
  if (!raw) {
    console.error("Release research failed; nothing was added.");
    process.exit(1);
  }

  const valid = [];
  for (const entry of raw) {
    let checked;
    try {
      checked = validateEntry(entry, today, maxAge);
    } catch (error) {
      console.warn(`skipped: ${error.message}`);
      continue;
    }
    if (await sourceIsDead(checked.source_url)) {
      console.warn(`skipped: ${checked.provider} ${checked.name} source ${checked.source_url} does not load`);
      continue;
    }
    valid.push(checked);
  }

  const merged = mergeReleases(releases, valid, today);
  releases.last_checked = `${now.toISOString().slice(0, 19)}Z`;
  releases.entries = merged.entries;
  await writeFile(RELEASES_FILE, `${JSON.stringify(releases, null, 2)}\n`);
  for (const entry of merged.added) console.log(`added: ${entry.date} ${entry.provider} ${entry.name}`);
  console.log(`releases: ${merged.added.length} added, ${releases.entries.length} total`);
}
