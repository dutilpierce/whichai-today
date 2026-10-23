import models from "./models.json";

export const categoryKeys = Object.keys(models.categories);

export function categoryGuide() {
  return Object.entries(models.categories)
    .map(
      ([key, category]) =>
        `- ${key}: ${category.display_name} (e.g. ${category.keywords.slice(0, 8).join(", ")})`,
    )
    .join("\n");
}

export async function generateJson<T>({
  model,
  system,
  prompt,
  schema,
  timeoutMs,
}: {
  model: string;
  system: string;
  prompt: string;
  schema: object;
  timeoutMs: number;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("");
  return JSON.parse(text) as T;
}
