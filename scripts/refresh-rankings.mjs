import { readFile, writeFile } from "node:fs/promises";

const MODELS_FILE = new URL("../lib/models.json", import.meta.url);
const HISTORY_FILE = new URL("../lib/history.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const FIELDS = [
  "name",
  "provider",
  "badge",
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
];
const ACCESS = new Set(["free_limited", "paid", "api_only"]);
const MAX_LENGTH = {
  name: 60,
  provider: 40,
  badge: 40,
  why: 220,
  benchmark_context: 160,
  direct_link: 200,
  where_to_get: 160,
  access: 20,
  cost: 200,
  free_tier: 220,
  when_not: 220,
  starter_prompt: 240,
  source_url: 200,
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

Search the web for the latest results on independent leaderboards relevant to this category (for example LMArena, Artificial Analysis, Vals AI, SWE-bench, LiveCodeBench, GPQA, Humanity's Last Exam). Also check the provider's current plan page for where a normal person gets the model and what it costs. Decide the current:
- leader: the best model for this category right now
- runner_up: the best alternative from a different provider than the leader when possible
- open_source_pick: the best open-weights model (weights downloadable)

Keep a current pick if it is still accurate. Only use models that are publicly available today. Do not invent prices. If a price is not on an official page, describe the plan without a number.

Return ONLY a JSON object, with no markdown, shaped exactly like:
{"leader": P, "runner_up": P, "open_source_pick": P}
where each P is:
{"name":"model name","provider":"company","badge":"2-4 word callout","why":"one plain-English sentence under 25 words","benchmark_context":"benchmark name and score","direct_link":"https URL of the official chat app, or the Hugging Face page for open models","where_to_get":"one line naming the app, the plan, and which model to select","access":"free_limited or paid or api_only","cost":"plan price or rough API price","free_tier":"whether a free plan can use it, and the notable limit","when_not":"one honest line on when this pick is the wrong choice","starter_prompt":"one short example prompt","source_url":"https URL of the leaderboard behind this pick"}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function validate(result, today) {
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
    next.checked = today;
    picks[slot] = next;
  }
  if (sameName(picks.leader.name, picks.runner_up.name)) {
    throw new Error("leader and runner_up are the same model");
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
  return validate(extractJson(text), today);
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

  const third = base();
  third.pending_leader = { name: "Delta", since: "2026-10-25" };
  applyResearch(third, { entries: [] }, "coding", { ...base(), leader: blank("Epsilon") }, "2026-10-26");
  assert(third.leader.name === "Alpha", "a different challenger should not switch yet");
  assert(third.pending_leader.name === "Epsilon", "a different challenger should replace pending");

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

const models = JSON.parse(await readFile(MODELS_FILE, "utf8"));
const history = JSON.parse(await readFile(HISTORY_FILE, "utf8"));
const today = new Date().toISOString().slice(0, 10);
let failures = 0;

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
  const switched = applyResearch(category, history, key, picks, today);
  const state = switched ? "switched" : category.pending_leader ? `pending ${category.pending_leader.name}` : "updated";
  console.log(`${key}: ${SLOTS.map((slot) => category[slot].name).join(" / ")} (${state})`);
}

if (failures === 0) {
  models.last_updated = `${today}T12:00:00Z`;
}

await writeFile(MODELS_FILE, `${JSON.stringify(models, null, 2)}\n`);
await writeFile(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`);

if (failures === Object.keys(models.categories).length) {
  console.error("Every category failed; nothing was refreshed.");
  process.exit(1);
}
