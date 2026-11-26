// Tests every configured AI provider on its own, so a broken fallback is found before it is
// needed (credits run out, a model id is retired, a key is revoked). Two checks per provider:
//   research: the exact path the data jobs use (scripts/ai.mjs, live web search, one search)
//   site:     a structured-JSON call with the site's quick model from lib/ai-models.json, in the
//             same request shape lib/ai.ts sends
// A few tiny calls per provider. Exits 1 if any configured provider fails either check.
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { configuredProviders, MODEL_OF, research } from "./ai.mjs";

const SITE_MODELS = JSON.parse(await readFile(new URL("../lib/ai-models.json", import.meta.url), "utf8"));
const TIMEOUT = 120_000;

const SCHEMA = {
  type: "object",
  properties: { category: { type: "string" }, confidence: { type: "number" } },
  required: ["category", "confidence"],
  additionalProperties: false,
};
const SYSTEM = "You route a question to one category. Answer with JSON only.";
const PROMPT = 'Categories: coding, writing, images. Question: "fix my python bug". Return {"category": ..., "confidence": 0-1}.';

async function siteClaude(model) {
  const client = new Anthropic({ maxRetries: 0, timeout: TIMEOUT });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 400,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content: PROMPT }],
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
  });
  return response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

async function siteGemini(model) {
  // Gemini rejects additionalProperties, as lib/ai.ts's forGemini() notes.
  const schema = { type: SCHEMA.type, properties: SCHEMA.properties, required: SCHEMA.required };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

async function siteOpenAI(model) {
  const client = new OpenAI({ maxRetries: 0, timeout: TIMEOUT });
  const response = await client.responses.create({
    model,
    instructions: SYSTEM,
    input: PROMPT,
    reasoning: { effort: "low" },
    max_output_tokens: 800,
    text: { format: { type: "json_schema", name: "answer", schema: SCHEMA, strict: false } },
  });
  if (response.status === "incomplete") throw new Error("OpenAI's answer was cut off");
  return response.output_text;
}

const SITE = { Claude: siteClaude, Gemini: siteGemini, OpenAI: siteOpenAI };

function checkSiteAnswer(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed.category !== "string" || !parsed.category) throw new Error(`no category in ${text.slice(0, 80)}`);
  return parsed.category;
}

const RESEARCH_PROMPT =
  'Use web search once to find the official homepage of the Hugging Face company. Return ONLY JSON: {"url":"https://...","title":"page title"}';

function checkResearchAnswer(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!/^https:\/\//.test(parsed.url ?? "")) throw new Error("no https url in the answer");
  return parsed.url;
}

const providers = configuredProviders();
if (!providers.length) {
  console.error("No AI key is set (ANTHROPIC_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY).");
  process.exit(1);
}
console.log(`Configured, in fallback order: ${providers.join(" -> ")}`);

const failures = [];
for (const name of providers) {
  try {
    const url = await research(RESEARCH_PROMPT, {
      timeoutMs: TIMEOUT,
      maxSearches: 1,
      effort: "low",
      maxOutputTokens: 2048,
      accept: checkResearchAnswer,
      only: [name],
    });
    console.log(`ok   research  ${name} (${MODEL_OF[name]}): ${url}`);
  } catch (error) {
    failures.push(`research ${name} (${MODEL_OF[name]}): ${error.message}`);
    console.error(`FAIL research  ${name} (${MODEL_OF[name]}): ${error.message}`);
  }
  const model = SITE_MODELS.quick[name];
  try {
    const category = checkSiteAnswer(await SITE[name](model));
    console.log(`ok   site      ${name} (${model}): category=${category}`);
  } catch (error) {
    failures.push(`site ${name} (${model}): ${error.message}`);
    console.error(`FAIL site      ${name} (${model}): ${error.message}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} provider check(s) failed. The fallback chain is weaker until this is fixed.`);
  process.exit(1);
}
console.log("\nEvery configured provider works on both paths.");
