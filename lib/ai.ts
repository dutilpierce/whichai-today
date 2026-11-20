import Anthropic from "@anthropic-ai/sdk";
import models from "./models.json";

export const categoryKeys = Object.keys(models.categories);

/** Fast, cheap model for per-visitor calls (Quick pick routing, ready prompts). */
export const QUICK_MODEL = "claude-haiku-5-5";
/** Stronger model for multi-step reasoning (Plan a project). */
export const PLANNER_MODEL = "claude-sonnet-5-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function categoryGuide() {
  return Object.entries(models.categories)
    .map(
      ([key, category]) =>
        `- ${key}: ${category.display_name} (e.g. ${category.keywords.slice(0, 8).join(", ")})`,
    )
    .join("\n");
}

let client: Anthropic | null = null;

/** Created on first use so builds and keyless environments never construct it. */
function anthropic() {
  client ??= new Anthropic();
  return client;
}

/**
 * Ask Claude for one JSON object matching `schema`. Structured outputs guarantee
 * the shape; callers still validate values. Throws on a timeout, a refusal, or a
 * cut-off answer so each route can fall back the way it already does.
 */
export async function generateJson<T>({
  model,
  system,
  prompt,
  schema,
  timeoutMs,
  effort = "low",
  maxTokens = 4000,
}: {
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const response = await anthropic().beta.messages.create(
    {
      model,
      max_tokens: maxTokens,
      // On a safety decline, re-run on the model's default fallback instead of failing.
      // Models without fallbacks simply run alone.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        effort,
        format: { type: "json_schema", schema },
      },
    },
    // Each route has a hard time budget, so one attempt only.
    { timeout: timeoutMs, maxRetries: 0 },
  );

  if (response.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (response.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off");

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  return JSON.parse(text) as T;
}
