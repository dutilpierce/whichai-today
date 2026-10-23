import models from "@/lib/models.json";

const FALLBACK = "general";
const MODEL = process.env.CLASSIFIER_MODEL ?? "gemini-3.5-flash-lite";
const categoryKeys = Object.keys(models.categories);

const instructions = [
  "You route a user's task to exactly one category for WhichAI.today.",
  "Categories:",
  ...Object.entries(models.categories).map(
    ([key, category]) =>
      `- ${key}: ${category.display_name} (e.g. ${category.keywords.slice(0, 8).join(", ")})`,
  ),
  `Pick the single best fit. Use "${FALLBACK}" for everyday tasks, images, design, or anything that fits nowhere else.`,
].join("\n");

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const body = await request.json().catch(() => null);
  const query =
    typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

  if (!query || !apiKey) {
    return Response.json({ category: FALLBACK });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: query }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: { category: { type: "string", enum: categoryKeys } },
              required: ["category"],
            },
          },
        }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const category = JSON.parse(text).category;

    return Response.json({
      category: categoryKeys.includes(category) ? category : FALLBACK,
    });
  } catch (error) {
    console.error("classify failed", error);
    return Response.json({ category: FALLBACK });
  }
}
