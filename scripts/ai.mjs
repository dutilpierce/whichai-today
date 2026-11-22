import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Research tries each provider whose key is set, in order: Claude (web search), Gemini
// (Google Search), then OpenAI (web search). One provider running out of credit or going
// down no longer stops a refresh.
const CLAUDE_MODEL = process.env.CLAUDE_REFRESH_MODEL ?? "claude-sonnet-5-5";
const GEMINI_MODEL = process.env.GEMINI_REFRESH_MODEL ?? "gemini-3.8-flash";
const OPENAI_MODEL = process.env.OPENAI_REFRESH_MODEL ?? "gpt-6.2-astra";
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

export const AI_READY = Boolean(CLAUDE_KEY || GEMINI_KEY || OPENAI_KEY);

// A server-side search loop can pause after ~10 steps; resume it a few times at most.
const MAX_CONTINUATIONS = 4;

async function askClaude(prompt, { timeoutMs, maxSearches, effort }) {
  const client = new Anthropic({ apiKey: CLAUDE_KEY, timeout: timeoutMs, maxRetries: 2 });
  const messages = [{ role: "user", content: prompt }];

  for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
    const response = await client.beta.messages
      .stream({
        model: CLAUDE_MODEL,
        max_tokens: 32000,
        // On a safety decline, re-run on the model's default fallback instead of failing.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }],
        messages,
      })
      .finalMessage();

    if (response.stop_reason === "pause_turn") {
      // Send the partial turn back unchanged; the API resumes where it stopped.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") throw new Error("Claude declined the research request");
    if (response.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off");

    // Only the answer written after the last search result; earlier text is search commentary.
    const lastSearch = response.content.findLastIndex((block) => block.type === "web_search_tool_result");
    const text = response.content
      .slice(lastSearch + 1)
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    if (!text.trim()) throw new Error("Claude returned no answer text");
    return text;
  }
  throw new Error("Claude's research did not finish");
}

async function askGemini(prompt, { timeoutMs }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  if (!text.trim()) throw new Error("Gemini returned no answer text");
  return text;
}

async function askOpenAI(prompt, { timeoutMs, effort }) {
  const client = new OpenAI({ apiKey: OPENAI_KEY, timeout: timeoutMs, maxRetries: 1 });
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
    reasoning: { effort: effort === "high" ? "high" : "medium" },
    tools: [{ type: "web_search", search_context_size: "medium" }],
    max_output_tokens: 32000,
  });
  if (response.status === "incomplete") {
    throw new Error(`OpenAI stopped early: ${response.incomplete_details?.reason ?? "unknown"}`);
  }
  if (!response.output_text?.trim()) throw new Error("OpenAI returned no answer text");
  return response.output_text;
}

/**
 * Ask a research question with live web search and return the answer text.
 * Callers parse the JSON out of it. Throws only when every configured provider fails.
 */
export async function research(prompt, { timeoutMs, maxSearches = 8, effort = "medium" }) {
  const providers = [
    CLAUDE_KEY ? ["Claude", askClaude] : null,
    GEMINI_KEY ? ["Gemini", askGemini] : null,
    OPENAI_KEY ? ["OpenAI", askOpenAI] : null,
  ].filter(Boolean);

  const errors = [];
  for (const [name, ask] of providers) {
    try {
      const text = await ask(prompt, { timeoutMs, maxSearches, effort });
      console.log(`research answered by ${name}`);
      return text;
    } catch (error) {
      console.error(`${name} research failed: ${error.message}`);
      errors.push(`${name}: ${error.message}`);
    }
  }
  throw new Error(errors.length ? errors.join("; ") : "No AI provider is configured");
}
