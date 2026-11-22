import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import models from "./models.json";

export const categoryKeys = Object.keys(models.categories);

/**
 * Two kinds of call: "quick" for per-visitor calls (Quick pick routing, ready
 * prompts) and "planner" for multi-step reasoning (Plan a project). Each kind
 * has a model on each provider. Each provider whose key is set is tried in turn
 * (Claude, then Gemini, then OpenAI), so one provider running out of credit or
 * going down does not take the features offline.
 */
export type Tier = "quick" | "planner";

const CLAUDE_MODEL: Record<Tier, string> = {
  quick: "claude-haiku-5-5",
  planner: "claude-sonnet-5-5",
};

const GEMINI_MODEL: Record<Tier, string> = {
  quick: "gemini-3.5-flash-lite",
  planner: "gemini-3.8-flash",
};

const OPENAI_MODEL: Record<Tier, string> = {
  quick: "gpt-6.1-terra",
  planner: "gpt-6.2-astra",
};

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export function categoryGuide() {
  return Object.entries(models.categories)
    .map(
      ([key, category]) =>
        `- ${key}: ${category.display_name} (e.g. ${category.keywords.slice(0, 8).join(", ")})`,
    )
    .join("\n");
}

type Request = {
  tier: Tier;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  maxTokens?: number;
};

let client: Anthropic | null = null;

/** Created on first use so builds and keyless environments never construct it. */
function anthropic() {
  client ??= new Anthropic();
  return client;
}

async function askClaude({ tier, system, prompt, schema, timeoutMs, maxTokens = 4000 }: Request) {
  const response = await anthropic().beta.messages.create(
    {
      model: CLAUDE_MODEL[tier],
      max_tokens: maxTokens,
      // On a safety decline, re-run on the model's default fallback instead of failing.
      // Models without fallbacks simply run alone.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema },
      },
    },
    // Each route has a hard time budget, so one attempt per provider.
    { timeout: timeoutMs, maxRetries: 0 },
  );

  if (response.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (response.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off");

  return response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

/** Gemini's schema support differs slightly; drop the Claude-only strictness flag. */
function forGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(forGemini);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== "additionalProperties")
      .map(([key, value]) => [key, forGemini(value)]),
  );
}

async function askGemini({ tier, system, prompt, schema, timeoutMs }: Request) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL[tier]}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: forGemini(schema),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("");
}

let openaiClient: OpenAI | null = null;

async function askOpenAI({ tier, system, prompt, schema, timeoutMs, maxTokens = 4000 }: Request) {
  openaiClient ??= new OpenAI();
  const response = await openaiClient.responses.create(
    {
      model: OPENAI_MODEL[tier],
      instructions: system,
      input: prompt,
      reasoning: { effort: "low" },
      // Reasoning tokens count toward the cap, so leave room beyond the answer itself.
      max_output_tokens: maxTokens * 2,
      // Not strict: these schemas leave some fields optional, which strict mode rejects.
      text: { format: { type: "json_schema", name: "answer", schema, strict: false } },
    },
    { timeout: timeoutMs, maxRetries: 0 },
  );
  if (response.status === "incomplete") throw new Error("OpenAI's answer was cut off");
  return response.output_text;
}

/**
 * Ask for one JSON object matching `schema`, trying Claude, Gemini, then OpenAI. Callers
 * still validate values. Throws only when every configured provider fails, so
 * each route can fall back the way it already does.
 */
export async function generateJson<T>(request: Request): Promise<T> {
  const providers = [
    process.env.ANTHROPIC_API_KEY ? { name: "Claude", ask: askClaude } : null,
    process.env.GEMINI_API_KEY ? { name: "Gemini", ask: askGemini } : null,
    process.env.OPENAI_API_KEY ? { name: "OpenAI", ask: askOpenAI } : null,
  ].filter((provider) => provider !== null);

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return JSON.parse(await provider.ask(request)) as T;
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.length ? errors.join("; ") : "No AI provider is configured");
}
