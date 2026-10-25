import { generateJson } from "@/lib/gemini";
import { checkPrompt } from "@/lib/prompt-rules.mjs";
import { assemblePrompt, isCategoryKey, isTweak, tweakNotes } from "@/lib/prompt-text";
import { knownModel, promptKey, promptRulesInput } from "@/lib/prompt";
import { sensitiveKind } from "@/lib/sensitive";
import { allow, cached } from "@/lib/store";

const MODEL = process.env.PROMPT_MODEL ?? "gemini-3.5-flash-lite";
const CACHE_SECONDS = 60 * 60 * 24 * 30;

type Fields = {
  role?: string;
  task?: string;
  context?: string;
  format?: string;
  tone?: string;
  constraints?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 400) : "";
}

export async function POST(request: Request) {
  if (!(await allow(request, "prompt", 20, 60))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const target = typeof body?.target === "string" ? body.target.trim() : "";
  const tweaks = Array.isArray(body?.tweaks)
    ? body.tweaks.filter((item: unknown): item is string => typeof item === "string" && isTweak(item)).slice(0, 5)
    : [];

  if (!query || !isCategoryKey(category) || !knownModel(target)) {
    return Response.json({ prompt: null });
  }
  const kind = sensitiveKind(query, category);
  if (kind === "crisis") return Response.json({ prompt: null });
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ prompt: null });
  }

  const rules = promptRulesInput(target);
  const key = promptKey(query, category, tweaks);

  try {
    const prompt = await cached(key, CACHE_SECONDS, async () => {
      const data = await generateJson<Fields>({
        model: MODEL,
        system: [
          `Write a prompt the user will paste into ${target}.`,
          "Return instructions only. Do not do the task.",
          "Do not name any other model, company, price, score, or benchmark.",
          "Use [brackets] for anything the user still has to fill in.",
          "Keep Role, Task, Context, Output format, Tone, and Constraints as separate fields.",
          tweaks.length ? `Apply these changes, in order: ${tweakNotes(tweaks)}` : "",
          kind ? "The task is sensitive. The constraints must say the answer is educational and not personalized advice." : "",
        ]
          .filter(Boolean)
          .join(" "),
        prompt: query,
        schema: {
          type: "object",
          properties: {
            role: { type: "string" },
            task: { type: "string" },
            context: { type: "string" },
            format: { type: "string" },
            tone: { type: "string" },
            constraints: { type: "string" },
          },
          required: ["role", "task", "context", "format", "tone", "constraints"],
        },
        timeoutMs: 12_000,
      });

      const text = assemblePrompt({
        role: clean(data.role) || `You are the assistant in ${target}.`,
        task: clean(data.task) || query,
        context: clean(data.context) || "[Add any files, examples, or details still needed]",
        format: clean(data.format) || "[Say what the answer should look like]",
        tone: clean(data.tone) || "Plain and direct.",
        constraints: `${clean(data.constraints) || "Follow only what the user asked."}${kind ? " Educational, not personalized advice." : ""}`,
      });
      return checkPrompt(text, { ...rules, query }).length === 0 ? text : null;
    });
    return Response.json({ prompt });
  } catch (error) {
    console.error("prompt failed", error);
    return Response.json({ prompt: null });
  }
}
