import models from "./models.json";

export type Access = "free_limited" | "paid" | "api_only";

export type ModelProfile = {
  name: string;
  provider: string;
  badge: string;
  why: string;
  benchmark_context: string;
  direct_link: string;
  where_to_get: string;
  access: string;
  cost: string;
  free_tier: string;
  when_not: string;
  starter_prompt: string;
  source_url: string;
  checked: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pick the category whose keywords appear most often as word prefixes. Ties keep JSON order. */
export function matchCategory(query: string): string | null {
  const text = query.toLowerCase();
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, category] of Object.entries(models.categories)) {
    let score = 0;
    for (const keyword of category.keywords) {
      const pattern = new RegExp(`\\b${escapeRegExp(keyword)}`, "i");
      if (pattern.test(text)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore === 0 ? null : bestKey;
}
