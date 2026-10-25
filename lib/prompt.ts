import { createHash } from "node:crypto";
import models from "./models.json";

const SLOTS = ["leader", "runner_up", "open_source_pick"] as const;

export function promptKey(query: string, category: string, tweaks: string[]) {
  const body = JSON.stringify({
    q: query.toLowerCase().replace(/\s+/g, " ").trim(),
    category,
    tweaks,
  });
  return `prompt:${createHash("sha256").update(body).digest("hex")}`;
}

export function knownModel(name: string) {
  for (const category of Object.values(models.categories)) {
    for (const slot of SLOTS) {
      if (category[slot].name === name) return category[slot];
    }
  }
  return null;
}

export function promptRulesInput(target: string) {
  const names = new Set<string>();
  const providers = new Set<string>();
  const boards = new Set<string>();
  let targetProvider = "";
  for (const category of Object.values(models.categories)) {
    if (category.primary_signal) boards.add(category.primary_signal);
    for (const source of category.sources ?? []) boards.add(source);
    for (const slot of SLOTS) {
      names.add(category[slot].name);
      providers.add(category[slot].provider);
      if (category[slot].name === target) targetProvider = category[slot].provider;
    }
  }
  return {
    target,
    targetProvider,
    names: [...names],
    providers: [...providers],
    boards: [...boards],
  };
}
