import models from "./models.json";

export const UNRANKED_INTENTS = ["image", "video", "design", "presentation", "voice"] as const;

export type UnrankedIntent = (typeof UNRANKED_INTENTS)[number];

const INTENTS: { id: UnrankedIntent; notice: string; keywords: string[] }[] = [
  {
    id: "image",
    notice: "Image generation isn't ranked here yet.",
    keywords: [
      "logo",
      "image",
      "picture",
      "photo",
      "illustration",
      "drawing",
      "thumbnail",
      "poster",
    ],
  },
  {
    id: "video",
    notice: "Video generation isn't ranked here yet.",
    keywords: ["video", "animate", "animation", "clip", "footage", "reel"],
  },
  {
    id: "design",
    notice: "Design tools aren't ranked here yet.",
    keywords: ["design", "mockup", "figma"],
  },
  {
    id: "presentation",
    notice: "Presentations aren't ranked here yet.",
    keywords: ["presentation", "slides", "slideshow", "powerpoint", "keynote", "deck"],
  },
  {
    id: "voice",
    notice: "Voice and audio aren't ranked here yet.",
    keywords: ["voice", "transcribe", "transcription", "speech", "podcast", "audio"],
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function intentNotice(id: UnrankedIntent) {
  return INTENTS.find((intent) => intent.id === id)?.notice ?? "This isn't ranked here yet.";
}

/** Unranked work (images, video, design, slides, voice) wins over a text category. */
export function matchIntent(query: string): UnrankedIntent | null {
  const text = query.toLowerCase();
  let best: UnrankedIntent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (new RegExp(`\\b${escapeRegExp(keyword)}`, "i").test(text)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent.id;
    }
  }
  if (categoryForIntent(best)) return null;
  return best;
}

/** When a board exists, the intent is a category, not a "not ranked" notice. */
export function categoryForIntent(intent: string | null | undefined) {
  if (intent === "image" && "images" in models.categories) return "images";
  if (intent === "video" && "video" in models.categories) return "video";
  return null;
}
