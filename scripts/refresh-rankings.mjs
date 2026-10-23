import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../lib/models.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const SLOTS = ["leader", "runner_up", "open_source_pick"];
const FIELDS = ["name", "provider", "badge", "why", "benchmark_context", "direct_link"];
const MAX_LENGTH = { name: 60, provider: 40, badge: 40, why: 220, benchmark_context: 160, direct_link: 200 };

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

function prompt(today, category) {
  const current = Object.fromEntries(SLOTS.map((slot) => [slot, category[slot]]));
  return `Today is ${today}. You maintain WhichAI.today, which tells people which AI model is best for a task right now.

Category: ${category.display_name}
Typical tasks: ${category.keywords.slice(0, 15).join(", ")}

Current picks:
${JSON.stringify(current, null, 2)}

Search the web for the latest results on independent leaderboards relevant to this category (for example LMArena, Artificial Analysis, Vals AI, SWE-bench, LiveCodeBench, GPQA, Humanity's Last Exam). Decide the current:
- leader: the best model for this category right now
- runner_up: the best alternative from a different provider than the leader when possible
- open_source_pick: the best open-weights model (weights downloadable)

Keep a current pick if it is still accurate. Only use models that are publicly available today.

Return ONLY a JSON object, with no markdown, shaped exactly like:
{"leader": P, "runner_up": P, "open_source_pick": P}
where each P is:
{"name": "model name", "provider": "company", "badge": "2-4 word callout", "why": "one plain-English sentence under 25 words", "benchmark_context": "benchmark name and score that backs this up", "direct_link": "https URL of the official chat app, or the Hugging Face page for open models"}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function validate(result) {
  for (const slot of SLOTS) {
    const profile = result?.[slot];
    if (!profile || typeof profile !== "object") throw new Error(`missing ${slot}`);
    for (const field of FIELDS) {
      const value = profile[field];
      if (typeof value !== "string" || !value.trim()) throw new Error(`${slot}.${field} is empty`);
      if (value.length > MAX_LENGTH[field]) throw new Error(`${slot}.${field} is too long`);
    }
    if (new URL(profile.direct_link).protocol !== "https:") throw new Error(`${slot}.direct_link is not https`);
  }
  if (result.leader.name.toLowerCase() === result.runner_up.name.toLowerCase()) {
    throw new Error("leader and runner_up are the same model");
  }
  return Object.fromEntries(
    SLOTS.map((slot) => [slot, Object.fromEntries(FIELDS.map((field) => [field, result[slot][field].trim()]))]),
  );
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
  return validate(extractJson(text));
}

const models = JSON.parse(await readFile(FILE, "utf8"));
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
  Object.assign(category, picks);
  console.log(`${key}: ${SLOTS.map((slot) => picks[slot].name).join(" / ")}`);
}

if (failures === 0) {
  models.last_updated = `${today}T12:00:00Z`;
}

await writeFile(FILE, `${JSON.stringify(models, null, 2)}\n`);

if (failures === Object.keys(models.categories).length) {
  console.error("Every category failed; nothing was refreshed.");
  process.exit(1);
}
