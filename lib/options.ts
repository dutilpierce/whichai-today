import { appsOffering } from "./apps";
import type { ModelProfile } from "./match";
import providers from "./providers.json";

export const OPTION_APPS = [
  { slug: "chatgpt", label: "ChatGPT" },
  { slug: "claude", label: "Claude" },
  { slug: "gemini", label: "Gemini" },
  { slug: "copilot", label: "Copilot" },
  { slug: "perplexity", label: "Perplexity" },
] as const;

export type Priority = "quality" | "cost" | "private";

export type Choice = {
  apps: string[];
  freeOnly: boolean;
  priority: Priority;
};

export const DEFAULT_CHOICE: Choice = { apps: [], freeOnly: false, priority: "quality" };

const APP_SLUGS = new Set<string>(OPTION_APPS.map((app) => app.slug));

export function encodeChoice(choice: Choice) {
  if (!choice.freeOnly && choice.apps.length === 0 && choice.priority === "quality") return "";
  const who = choice.freeOnly ? "free" : choice.apps.join(",");
  return `${who}|${choice.priority}`;
}

export function decodeChoice(value: string): Choice {
  const [who = "", priority = "quality"] = value.split("|");
  const nextPriority: Priority = priority === "cost" || priority === "private" ? priority : "quality";
  if (who === "free") return { apps: [], freeOnly: true, priority: nextPriority };
  const apps = who.split(",").filter((slug) => APP_SLUGS.has(slug));
  return { apps, freeOnly: false, priority: nextPriority };
}

export function readSavedChoice(): Choice {
  try {
    const raw = localStorage.getItem("whichai-options");
    if (!raw) return DEFAULT_CHOICE;
    const data = JSON.parse(raw) as Partial<Choice>;
    return {
      apps: Array.isArray(data.apps) ? data.apps.filter((slug) => APP_SLUGS.has(slug)) : [],
      freeOnly: Boolean(data.freeOnly),
      priority: data.priority === "cost" || data.priority === "private" ? data.priority : "quality",
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

export function saveChoice(choice: Choice) {
  localStorage.setItem("whichai-options", JSON.stringify(choice));
}

function picks(category: { leader: ModelProfile; runner_up: ModelProfile; open_source_pick: ModelProfile }) {
  return [category.leader, category.runner_up, category.open_source_pick];
}

function isFree(pick: ModelProfile) {
  return pick.access === "free_limited" || /^yes/i.test(pick.free_tier);
}

export function bestInside(
  category: { leader: ModelProfile; runner_up: ModelProfile; open_source_pick: ModelProfile },
  choice: Choice,
) {
  if (choice.priority === "private") {
    const open = category.open_source_pick;
    const via = appsOffering(open.name)[0];
    const plan = via?.models.find((model) => model.name === open.name)?.plan ?? "self-host";
    const where = via ? `${via.name} → ${open.name} (${plan})` : open.where_to_get;
    const privacy = providers[open.provider as keyof typeof providers]?.trains_by_default;
    return `Best inside what you have: ${where}.${privacy ? ` ${privacy}` : ""}`;
  }

  if (choice.freeOnly || choice.priority === "cost") {
    const free = picks(category).find(isFree);
    if (!free) return "";
    const via = appsOffering(free.name).find((app) => app.plans.some((plan) => plan.price_usd_month === 0));
    const plan = via?.plans.find((item) => item.price_usd_month === 0);
    const where = via ? `${via.name} → ${free.name} (${plan?.name ?? "Free"})` : free.where_to_get;
    return `Best inside what you have: ${where}.`;
  }

  if (!choice.apps.length) return "";
  for (const pick of picks(category)) {
    const via = appsOffering(pick.name).find((app) => choice.apps.includes(app.slug));
    if (!via) continue;
    const plan = via.models.find((model) => model.name === pick.name)?.plan ?? "included";
    return `Best inside what you have: ${via.name} → ${pick.name} (${plan}).`;
  }
  return "";
}

export function freeAndPaid(category: {
  leader: ModelProfile;
  runner_up: ModelProfile;
  open_source_pick: ModelProfile;
}) {
  const all = picks(category);
  const free = all.find(isFree) ?? null;
  const paid = all.find((pick) => pick.access === "paid") ?? category.leader;
  const freeApp = free
    ? appsOffering(free.name).find((app) => app.plans.some((plan) => plan.price_usd_month === 0))
    : undefined;
  const paidApp = appsOffering(paid.name)[0];
  return {
    free,
    freeApp,
    freeLimit: freeApp?.plans.find((plan) => plan.price_usd_month === 0)?.free_tier || free?.free_tier || "",
    paid,
    paidApp,
    paidPlan: paidApp?.models.find((model) => model.name === paid.name)?.plan || paid.cost,
  };
}
