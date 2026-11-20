import Anthropic from "@anthropic-ai/sdk";

// Research runs use Sonnet with live web search. Override with REFRESH_MODEL to try another model.
export const MODEL = process.env.REFRESH_MODEL ?? "claude-sonnet-5-5";
export const API_KEY = process.env.ANTHROPIC_API_KEY;

// A server-side search loop can pause after ~10 steps; resume it a few times at most.
const MAX_CONTINUATIONS = 4;

/**
 * Ask Claude a research question with web search on, and return the text of its
 * final answer (everything written after the last search result). Callers parse
 * the JSON out of that text. Throws on a refusal, a cut-off answer, or no answer.
 */
export async function research(prompt, { timeoutMs, maxSearches = 8, effort = "medium" }) {
  const client = new Anthropic({ timeout: timeoutMs, maxRetries: 2 });
  const messages = [{ role: "user", content: prompt }];

  for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
    const response = await client.beta.messages
      .stream({
        model: MODEL,
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
