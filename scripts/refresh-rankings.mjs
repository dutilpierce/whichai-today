import { readFile, writeFile } from "node:fs/promises";

const ARCHIVE_FILE = new URL("../lib/archive.json", import.meta.url);
const MODELS_FILE = new URL("../lib/models.json", import.meta.url);
const HISTORY_FILE = new URL("../lib/history.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const FIELDS = [
  "name",
  "provider",
  "why",
  "benchmark_context",
  "direct_link",
  "where_to_get",
  "access",
  "cost",
  "free_tier",
  "when_not",
  "starter_prompt",
  "source_url",
  "pick_if",
];
const ACCESS = new Set(["free_limited", "paid", "api_only"]);
const MAX_LENGTH = {
  name: 60,
  provider: 40,
  why: 220,
  benchmark_context: 180,
  direct_link: 200,
  where_to_get: 160,
  access: 20,
  cost: 200,
  free_tier: 220,
  when_not: 220,
  starter_prompt: 240,
  source_url: 200,
  pick_if: 160,
};

function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function prompt(today, category) {
  const current = Object.fromEntries(SLOTS.map((slot) => [slot, category[slot]]));
  return `Today is ${today}. You maintain WhichAI.today, which tells people which AI model is best for a task right now.

Category: ${category.display_name}
Typical tasks: ${category.keywords.slice(0, 15).join(", ")}

Current picks:
${JSON.stringify(current, null, 2)}

Search the web for the latest results on this category's primary signal first: ${category.primary_signal}. Count sources_agreeing and sources_checked only from this list, and sources_checked must be no more than ${category.sources?.length ?? 1}: ${(category.sources ?? [category.primary_signal]).join(", ")}. Use other boards only as support. The leader is whoever leads ${category.primary_signal}, not a general board, unless that signal is itself the general board. Also check the provider's current plan page for where a normal person gets the model and what it costs. Decide the current:
- leader: the best model for this category right now, ranked on ${category.primary_signal}
- runner_up: the best alternative from a different provider than the leader when possible
- open_source_pick: the best open-weights model (weights downloadable)

Keep a current pick if it is still accurate. Only use models that are publicly available today. Do not invent prices. If a price is not on an official page, describe the plan without a number. The leader's benchmark_context must start with "${category.primary_signal}". For the alternative and the open pick, benchmark_context is the evidence that actually justifies that pick. Never write "not cited". primary_score is the number for ${category.primary_signal}, or null if this pick has no score on it. The runner-up's primary_score must not be higher than the leader's when both are numbers.

Return ONLY a JSON object, with no markdown, shaped exactly like:
{"leader": P, "runner_up": P, "open_source_pick": P}
where each P is:
{"name":"model name","provider":"company","why":"one plain-English sentence under 25 words with no number that is not also in benchmark_context or cost","benchmark_context":"the leader starts with ${category.primary_signal}; the others state their own evidence","direct_link":"https URL of the official chat app, or the Hugging Face page for open models","where_to_get":"one line naming the app, the plan, and which model to select","access":"free_limited or paid or api_only","cost":"plan price or rough API price","free_tier":"whether a free plan can use it, and the notable limit","when_not":"one honest line on when this pick is the wrong choice","starter_prompt":"one short example prompt","source_url":"https URL of the leaderboard behind this pick","pick_if":"one line, Pick this when...","primary_score":1520,"sources_agreeing":1,"sources_checked":1}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function validate(result, category, today) {
  const picks = {};
  for (const slot of SLOTS) {
    const profile = result?.[slot];
    if (!profile || typeof profile !== "object") throw new Error(`missing ${slot}`);
    const next = {};
    for (const field of FIELDS) {
      const value = profile[field];
      if (typeof value !== "string" || !value.trim()) throw new Error(`${slot}.${field} is empty`);
      if (value.length > MAX_LENGTH[field]) throw new Error(`${slot}.${field} is too long`);
      next[field] = value.trim();
    }
    if (!ACCESS.has(next.access)) throw new Error(`${slot}.access is invalid`);
    for (const field of ["direct_link", "source_url"]) {
      if (new URL(next[field]).protocol !== "https:") throw new Error(`${slot}.${field} is not https`);
    }
    if (/not cited/i.test(next.benchmark_context)) {
      throw new Error(`${slot}.benchmark_context must state the evidence, not that a board was not cited`);
    }
    if (slot === "leader" && !next.benchmark_context.startsWith(category.primary_signal)) {
      throw new Error(`leader.benchmark_context must start with ${category.primary_signal}`);
    }
    const score = profile.primary_score;
    if (score !== null && (typeof score !== "number" || Number.isNaN(score))) {
      throw new Error(`${slot}.primary_score must be a number or null`);
    }
    for (const field of ["sources_agreeing", "sources_checked"]) {
      const value = profile[field];
      if (!Number.isInteger(value) || value < 0) throw new Error(`${slot}.${field} must be an integer`);
      next[field] = value;
    }
    if (next.sources_agreeing > next.sources_checked) {
      throw new Error(`${slot}.sources_agreeing cannot exceed sources_checked`);
    }
    const listed = Array.isArray(category.sources) ? category.sources.length : next.sources_checked;
    if (next.sources_checked > listed) {
      throw new Error(`${slot}.sources_checked exceeds the category source list`);
    }
    next.primary_score = score;
    next.checked = today;
    picks[slot] = next;
  }
  if (sameName(picks.leader.name, picks.runner_up.name)) {
    throw new Error("leader and runner_up are the same model");
  }
  const leaderScore = picks.leader.primary_score;
  const runnerScore = picks.runner_up.primary_score;
  if (leaderScore !== null && runnerScore !== null && runnerScore > leaderScore) {
    throw new Error("runner_up primary_score beats the leader on the primary signal");
  }
  return picks;
}

export function applyResearch(category, history, key, picks, today) {
  const leaderName = picks.leader.name;
  const keptName = category.leader.name;
  let switched = false;

  if (sameName(leaderName, keptName)) {
    delete category.pending_leader;
    for (const slot of SLOTS) category[slot] = picks[slot];
  } else if (category.pending_leader && sameName(category.pending_leader.name, leaderName)) {
    const previous = category.leader.name;
    category.leader = picks.leader;
    category.runner_up = sameName(picks.runner_up.name, leaderName) ? category.runner_up : picks.runner_up;
    category.open_source_pick = picks.open_source_pick;
    delete category.pending_leader;
    history.entries.push({
      category: key,
      leader: picks.leader.name,
      previous,
      date: today,
      type: "change",
      evidence: picks.leader.benchmark_context,
    });
    switched = true;
  } else {
    category.pending_leader = { name: picks.leader.name, since: today };
    if (!sameName(picks.runner_up.name, keptName)) category.runner_up = picks.runner_up;
    category.open_source_pick = picks.open_source_pick;
  }

  return switched;
}

async function research(today, category) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(today, category) }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  return validate(extractJson(text), category, today);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  function blank(name) {
    return {
      name,
      provider: "Test",
      badge: "Pick",
      why: "Because.",
      benchmark_context: "Board 1.",
      direct_link: "https://example.com",
      where_to_get: "App",
      access: "paid",
      cost: "$1",
      free_tier: "No",
      when_not: "Not for this.",
      starter_prompt: "Try this.",
      source_url: "https://example.com/board",
      pick_if: "Pick this when testing.",
      primary_score: 1,
      sources_agreeing: 1,
      sources_checked: 1,
      checked: "2026-10-24",
    };
  }

  const base = () => ({
    leader: blank("Alpha"),
    runner_up: blank("Beta"),
    open_source_pick: blank("Gamma"),
  });

  const same = base();
  same.pending_leader = { name: "Delta", since: "2026-10-24" };
  const history = { entries: [] };
  applyResearch(same, history, "coding", { ...base(), leader: { ...blank("Alpha"), why: "Still." } }, "2026-10-25");
  assert(same.leader.why === "Still.", "same leader should refresh details");
  assert(!same.pending_leader, "same leader should clear a pending challenger");
  assert(history.entries.length === 0, "same leader should not write history");

  const first = base();
  applyResearch(first, history, "coding", { ...base(), leader: blank("Delta"), runner_up: blank("Alpha") }, "2026-10-25");
  assert(first.leader.name === "Alpha", "first sighting should keep the leader");
  assert(first.pending_leader.name === "Delta", "first sighting should set pending");
  assert(first.runner_up.name === "Beta", "a runner-up that matches the kept leader should stay");
  assert(history.entries.length === 0, "first sighting should not write history");

  const second = base();
  second.pending_leader = { name: "Delta", since: "2026-10-25" };
  const log = { entries: [] };
  applyResearch(second, log, "coding", { ...base(), leader: blank("Delta") }, "2026-10-26");
  assert(second.leader.name === "Delta", "second sighting should switch the leader");
  assert(!second.pending_leader, "second sighting should clear pending");
  assert(log.entries[0].previous === "Alpha" && log.entries[0].leader === "Delta", "history should record the switch");
  assert(log.entries[0].type === "change", "a confirmed switch is a change, not a methodology note");

  const third = base();
  third.pending_leader = { name: "Delta", since: "2026-10-25" };
  applyResearch(third, { entries: [] }, "coding", { ...base(), leader: blank("Epsilon") }, "2026-10-26");
  assert(third.leader.name === "Alpha", "a different challenger should not switch yet");
  assert(third.pending_leader.name === "Epsilon", "a different challenger should replace pending");

  let rejected = false;
  try {
    validate(
      {
        leader: blank("Alpha"),
        runner_up: { ...blank("Beta"), primary_score: 9 },
        open_source_pick: blank("Gamma"),
      },
      { primary_signal: "Board" },
      "2026-10-24",
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "a higher runner-up score on the primary signal should fail");

  let tooMany = false;
  try {
    validate(
      {
        leader: { ...blank("Alpha"), sources_checked: 4 },
        runner_up: blank("Beta"),
        open_source_pick: blank("Gamma"),
      },
      { primary_signal: "Board", sources: ["Board"] },
      "2026-10-24",
    );
  } catch {
    tooMany = true;
  }
  assert(tooMany, "sources_checked cannot exceed the category source list");

  validate(
    {
      leader: blank("Alpha"),
      runner_up: { ...blank("Beta"), benchmark_context: "88.2% on SWE-bench Pro." },
      open_source_pick: blank("Gamma"),
    },
    { primary_signal: "Board" },
    "2026-10-24",
  );

  let uncited = false;
  try {
    validate(
      {
        leader: blank("Alpha"),
        runner_up: { ...blank("Beta"), benchmark_context: "Board not cited." },
        open_source_pick: blank("Gamma"),
      },
      { primary_signal: "Board" },
      "2026-10-24",
    );
  } catch {
    uncited = true;
  }
  assert(uncited, "not cited is not evidence");

  console.log("self-check ok");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const models = JSON.parse(await readFile(MODELS_FILE, "utf8"));
const history = JSON.parse(await readFile(HISTORY_FILE, "utf8"));
const archive = JSON.parse(await readFile(ARCHIVE_FILE, "utf8").catch(() => '{"models":[]}'));
const today = new Date().toISOString().slice(0, 10);
const changes = [];
let failures = 0;
const beforeProfiles = new Map();
for (const category of Object.values(models.categories)) {
  for (const slot of SLOTS) {
    const pick = category[slot];
    if (!beforeProfiles.has(pick.name)) beforeProfiles.set(pick.name, pick);
  }
}

for (const [key, category] of Object.entries(models.categories)) {
  let picks = null;
  for (let attempt = 1; attempt <= 2 && !picks; attempt++) {
    try {
      picks = await research(today, category);
    } catch (error) {
      console.error(`${key} attempt ${attempt} failed: ${error.message}`);
    }
  }
  if (!picks) {
    failures++;
    console.error(`${key}: keeping existing picks`);
    continue;
  }
  const before = history.entries.length;
  const switched = applyResearch(category, history, key, picks, today);
  if (switched && history.entries.length > before) changes.push(history.entries.at(-1));
  const state = switched ? "switched" : category.pending_leader ? `pending ${category.pending_leader.name}` : "updated";
  console.log(`${key}: ${SLOTS.map((slot) => category[slot].name).join(" / ")} (${state})`);
}

if (failures < Object.keys(models.categories).length) {
  models.last_updated = `${today}T12:00:00Z`;
}

const afterNames = new Set();
for (const category of Object.values(models.categories)) {
  for (const slot of SLOTS) afterNames.add(category[slot].name);
}
for (const [name, pick] of beforeProfiles) {
  if (afterNames.has(name)) continue;
  const slug = slugify(name);
  if (archive.models.some((model) => model.slug === slug)) continue;
  archive.models.push({
    name,
    provider: pick.provider,
    slug,
    where_to_get: pick.where_to_get,
    cost: pick.cost,
    free_tier: pick.free_tier,
    direct_link: pick.direct_link,
    access: pick.access,
  });
}

await writeFile(MODELS_FILE, `${JSON.stringify(models, null, 2)}\n`);
await writeFile(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`);
await writeFile(ARCHIVE_FILE, `${JSON.stringify(archive, null, 2)}\n`);
await writeFile(new URL("../changes-this-run.json", import.meta.url), `${JSON.stringify(changes, null, 2)}\n`);

if (failures === Object.keys(models.categories).length) {
  console.error("Every category failed; nothing was refreshed.");
  process.exit(1);
}
