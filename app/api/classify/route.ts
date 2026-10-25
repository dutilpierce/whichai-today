import { categoryGuide, categoryKeys, generateJson } from "@/lib/gemini";
import { UNRANKED_INTENTS, type UnrankedIntent } from "@/lib/intents";

const FALLBACK = "general";
const MODEL = process.env.CLASSIFIER_MODEL ?? "gemini-3.5-flash-lite";

const instructions = [
  "You route a user's task to exactly one category for WhichAI.today.",
  "Categories:",
  categoryGuide(),
  `Pick the single best fit. Use "${FALLBACK}" for everyday tasks or anything that fits nowhere else.`,
  "Also set intent when the task is mainly one of these, even if a text model could talk about it:",
  "- image: making or editing a picture, logo, icon, or illustration",
  "- video: making or animating video",
  "- design: visual design or a mockup",
  "- presentation: slides or a deck",
  "- voice: speech, transcription, or audio",
  'Use "none" when the task is ordinary text, code, or analysis.',
].join("\n");

function asIntent(value: string | undefined): UnrankedIntent | "none" {
  return (UNRANKED_INTENTS as readonly string[]).includes(value ?? "")
    ? (value as UnrankedIntent)
    : "none";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query =
    typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

  if (!query || !process.env.GEMINI_API_KEY) {
    return Response.json({ category: FALLBACK, intent: "none" });
  }

  try {
    const data = await generateJson<{ category?: string; intent?: string }>({
      model: MODEL,
      system: instructions,
      prompt: query,
      schema: {
        type: "object",
        properties: {
          category: { type: "string", enum: categoryKeys },
          intent: { type: "string", enum: [...UNRANKED_INTENTS, "none"] },
        },
        required: ["category", "intent"],
      },
      timeoutMs: 4000,
    });

    return Response.json({
      category: categoryKeys.includes(data.category ?? "")
        ? data.category
        : FALLBACK,
      intent: asIntent(data.intent),
    });
  } catch (error) {
    console.error("classify failed", error);
    return Response.json({ category: FALLBACK, intent: "none" });
  }
}
