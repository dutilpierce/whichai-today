import { categoryGuide, categoryKeys, generateJson } from "@/lib/gemini";

const FALLBACK = "general";
const MODEL = process.env.CLASSIFIER_MODEL ?? "gemini-3.5-flash-lite";

const instructions = [
  "You route a user's task to exactly one category for WhichAI.today.",
  "Categories:",
  categoryGuide(),
  `Pick the single best fit. Use "${FALLBACK}" for everyday tasks, images, design, or anything that fits nowhere else.`,
].join("\n");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query =
    typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

  if (!query || !process.env.GEMINI_API_KEY) {
    return Response.json({ category: FALLBACK });
  }

  try {
    const data = await generateJson<{ category?: string }>({
      model: MODEL,
      system: instructions,
      prompt: query,
      schema: {
        type: "object",
        properties: { category: { type: "string", enum: categoryKeys } },
        required: ["category"],
      },
      timeoutMs: 4000,
    });

    return Response.json({
      category: categoryKeys.includes(data.category ?? "")
        ? data.category
        : FALLBACK,
    });
  } catch (error) {
    console.error("classify failed", error);
    return Response.json({ category: FALLBACK });
  }
}
