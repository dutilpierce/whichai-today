import { readFile, writeFile } from "node:fs/promises";

const MODELS = new URL("../lib/models.json", import.meta.url);
const PROVIDERS = new URL("../lib/providers.json", import.meta.url);
const HELD = new URL("../lib/held.json", import.meta.url);
const SITE = new URL("../lib/site.json", import.meta.url);
const MODEL = process.env.REFRESH_MODEL ?? "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;

export function applyVerification(models, providers, held, results, today) {
  const facts = held.facts.filter((fact) => fact.kind !== "privacy" && fact.kind !== "cost");
  for (const result of results) {
    if (result.kind === "privacy" && providers[result.id]) {
      if (result.status === "match") providers[result.id].checked = today;
      if (result.status === "mismatch") {
        facts.push({ kind: "privacy", provider: result.id, reason: result.note || "Privacy text no longer matches the source." });
      }
    }
    if (result.kind === "cost") {
      let found = false;
      for (const category of Object.values(models.categories)) {
        for (const slot of ["leader", "runner_up", "open_source_pick"]) {
          const pick = category[slot];
          if (pick.name !== result.id) continue;
          found = true;
          if (result.status === "match") pick.checked = today;
        }
      }
      if (found && result.status === "mismatch") {
        facts.push({ kind: "cost", model: result.id, reason: result.note || "Price or free tier no longer matches the provider page." });
      }
    }
  }
  held.facts = facts;
  return results.some((result) => result.status === "mismatch");
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

async function ask(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  const parsed = extractJson(text);
  if (!Array.isArray(parsed.results)) throw new Error("verification response has no results");
  return parsed.results
    .filter((item) => item && typeof item.id === "string" && ["match", "mismatch", "unsure"].includes(item.status))
    .map((item) => ({
      kind: item.kind,
      id: item.id,
      status: item.status,
      note: typeof item.note === "string" ? item.note.slice(0, 240) : "",
    }));
}

function selfCheck() {
  const models = {
    categories: {
      coding: {
        leader: { name: "Alpha", checked: "2026-10-01", cost: "$1" },
        runner_up: { name: "Beta", checked: "2026-10-01", cost: "$2" },
        open_source_pick: { name: "Gamma", checked: "2026-10-01", cost: "$0" },
      },
    },
  };
  const providers = { Anthropic: { trains_by_default: "Only if you allow it.", checked: "2026-10-01" } };
  const held = { pages: ["/old"], facts: [{ kind: "privacy", provider: "Anthropic", reason: "old" }] };
  const original = providers.Anthropic.trains_by_default;
  const mismatch = applyVerification(models, providers, held, [
    { kind: "privacy", id: "Anthropic", status: "mismatch", note: "The default changed." },
    { kind: "cost", id: "Alpha", status: "match", note: "" },
  ], "2026-10-24");
  if (!mismatch) throw new Error("a mismatch should be reported");
  if (providers.Anthropic.trains_by_default !== original) throw new Error("mismatch must not rewrite the privacy text");
  if (providers.Anthropic.checked !== "2026-10-01") throw new Error("mismatch must not bump the checked date");
  if (models.categories.coding.leader.checked !== "2026-10-24") throw new Error("a matching price should bump checked");
  if (!held.facts.some((fact) => fact.provider === "Anthropic")) throw new Error("mismatch should be held");
  if (held.pages[0] !== "/old") throw new Error("page holds should stay");
  console.log("verify-facts self-check ok");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

const site = JSON.parse(await readFile(SITE, "utf8"));
if (!site.auto_publish) {
  console.log("Publishing is paused.");
  process.exit(0);
}
if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

const models = JSON.parse(await readFile(MODELS, "utf8"));
const providers = JSON.parse(await readFile(PROVIDERS, "utf8"));
const held = JSON.parse(await readFile(HELD, "utf8"));
const today = new Date().toISOString().slice(0, 10);
const results = [];

const privacyPrompt = `Today is ${today}. Check each privacy sentence against its source URL. Do not rewrite the sentence. status is match only if the sentence is still accurate, mismatch if it is not, unsure if you cannot tell. Return ONLY JSON: {"results":[{"kind":"privacy","id":"provider name","status":"match","note":"short"}]}
${JSON.stringify(providers, null, 2)}`;
results.push(...(await ask(privacyPrompt)).map((item) => ({ ...item, kind: "privacy" })));

for (const [key, category] of Object.entries(models.categories)) {
  const picks = ["leader", "runner_up", "open_source_pick"].map((slot) => ({
    name: category[slot].name,
    provider: category[slot].provider,
    cost: category[slot].cost,
    free_tier: category[slot].free_tier,
    direct_link: category[slot].direct_link,
  }));
  const prompt = `Today is ${today}. For each model, check cost and free_tier against the provider page at direct_link. Do not rewrite them. status is match, mismatch, or unsure. Return ONLY JSON: {"results":[{"kind":"cost","id":"model name","status":"match","note":"short"}]}
${JSON.stringify(picks, null, 2)}`;
  const found = await ask(prompt);
  results.push(...found.map((item) => ({ ...item, kind: "cost" })));
  console.log(`${key}: checked ${found.length} picks`);
}

const mismatch = applyVerification(models, providers, held, results, today);
await writeFile(MODELS, `${JSON.stringify(models, null, 2)}\n`);
await writeFile(PROVIDERS, `${JSON.stringify(providers, null, 2)}\n`);
await writeFile(HELD, `${JSON.stringify(held, null, 2)}\n`);

if (mismatch) {
  console.error("At least one fact no longer matches its source. The text was not rewritten.");
  process.exit(1);
}
console.log("verify-facts ok");
