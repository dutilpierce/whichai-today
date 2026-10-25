import { appList, planPrice, type AppRecord } from "./apps";

export const STACKS = [
  {
    id: "free",
    name: "Free",
    slugs: [] as string[],
    note: "No subscription. Use a free tier or an open-weights model.",
  },
  {
    id: "one",
    name: "One subscription",
    slugs: ["chatgpt"],
    note: "One chat app for most jobs.",
  },
  {
    id: "developer",
    name: "Developer",
    slugs: ["cursor", "github-copilot"],
    note: "An editor, plus suggestions inside an editor.",
  },
  {
    id: "privacy",
    name: "Privacy-first",
    slugs: ["ollama"],
    note: "A local runner, so the work can stay on your machine.",
  },
];

export function stackTotal(slugs: string[], apps: AppRecord[] = appList()) {
  if (slugs.length === 0) return { label: "$0/month", ready: true };
  let total = 0;
  for (const slug of slugs) {
    const app = apps.find((item) => item.slug === slug);
    const prices = (app?.plans ?? [])
      .map((plan) => plan.price_usd_month)
      .filter((price): price is number => typeof price === "number");
    if (!app || prices.length === 0) return { label: "Not added up. A price is not stored yet.", ready: false };
    const paid = prices.filter((price) => price > 0);
    total += paid.length ? Math.min(...paid) : 0;
  }
  return { label: total === 0 ? "$0/month" : planPrice(total), ready: true };
}
