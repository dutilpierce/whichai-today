import { createHash } from "node:crypto";
import { aiConfigured, categoryGuide, categoryKeys, generateJson } from "@/lib/ai";
import { UNRANKED_INTENTS, type UnrankedIntent } from "@/lib/intents";
import { allow, readCache, writeCacheLater } from "@/lib/store";

const FALLBACK = "general";
// Part of the cache key. Unchanged since the Gemini-only days so answers saved then still hit.
const CACHE_VERSION = "gemini-3.5-flash-lite";
const CACHE_SECONDS = 60 * 60 * 24 * 30;

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

/** The same question gets the same route. The key includes the instructions and a version, so changing either starts fresh. */
function classifyKey(query: string) {
  const body = JSON.stringify({
    q: query.toLowerCase().replace(/\s+/g, " ").trim(),
    instructions,
    model: CACHE_VERSION,
  });
  return `classify:${createHash("sha256").update(body).digest("hex")}`;
}

/** A saved answer, only if it still names a current category and intent. */
function parseSaved(hit: string | null) {
  if (!hit) return null;
  try {
    const data = JSON.parse(hit) as { category?: string; intent?: string };
    if (!categoryKeys.includes(data.category ?? "") || asIntent(data.intent) !== data.intent) return null;
    return { category: data.category as string, intent: data.intent };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query =
    typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

  if (!query || !aiConfigured()) {
    return Response.json({ category: FALLBACK, intent: "none" });
  }
  // The cache read runs alongside the rate-limit check, so a first-time question waits no longer than before.
  const key = classifyKey(query);
  const [allowed, hit] = await Promise.all([allow(request, "classify", 30, 60), readCache(key)]);
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const saved = parseSaved(hit);
  if (saved) return Response.json(saved);

  try {
    const data = await generateJson<{ category?: string; intent?: string }>({
      tier: "quick",
      system: instructions,
      prompt: query,
      schema: {
        type: "object",
        properties: {
          category: { type: "string", enum: categoryKeys },
          intent: { type: "string", enum: [...UNRANKED_INTENTS, "none"] },
        },
        required: ["category", "intent"],
        additionalProperties: false,
      },
      maxTokens: 1000,
      timeoutMs: 6000,
    });

    const answer = {
      category: categoryKeys.includes(data.category ?? "")
        ? (data.category as string)
        : FALLBACK,
      intent: asIntent(data.intent),
    };
    // Only real answers are saved. A failed or timed-out call falls back below and is asked again next time.
    writeCacheLater(key, JSON.stringify(answer), CACHE_SECONDS);
    return Response.json(answer);
  } catch (error) {
    console.error("classify failed", error);
    return Response.json({ category: FALLBACK, intent: "none" });
  }
}
