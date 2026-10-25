import models from "./models.json";
import tasks from "./tasks.json";

export const TWEAKS = [
  { id: "shorter", label: "Shorter", hint: "Make it shorter. Keep every section." },
  { id: "detailed", label: "More detailed", hint: "Add the missing specifics as [bracket] placeholders, not invented facts." },
  { id: "questions", label: "Ask me questions first", hint: "Tell the assistant to ask the needed questions before doing the task." },
  { id: "checklist", label: "As a checklist", hint: "Ask for the answer as a checklist." },
  { id: "steps", label: "Step by step", hint: "Ask for the answer as numbered steps." },
] as const;

export type TweakId = (typeof TWEAKS)[number]["id"];

const TWEAK_IDS = new Set<string>(TWEAKS.map((tweak) => tweak.id));

export function isTweak(value: string): value is TweakId {
  return TWEAK_IDS.has(value);
}

export const CHECKS = [
  { label: "Goal", prefix: "Task", hint: "Say what you want done." },
  { label: "Context", prefix: "Context", hint: "Name the audience, or paste the material inside the brackets." },
  { label: "Format", prefix: "Output format", hint: "Say what the finished answer should look like." },
  { label: "Tone", prefix: "Tone", hint: "Say how the answer should sound." },
  { label: "Constraints", prefix: "Constraints", hint: "Add a limit, such as length or what to leave out." },
] as const;

type CategoryKey = keyof typeof models.categories;

export function isCategoryKey(value: string): value is CategoryKey {
  return value in models.categories;
}

export function assemblePrompt(fields: {
  role: string;
  task: string;
  context: string;
  format: string;
  tone: string;
  constraints: string;
}) {
  return [
    `Role: ${fields.role.trim()}`,
    `Task: ${fields.task.trim()}`,
    `Context: ${fields.context.trim()}`,
    `Output format: ${fields.format.trim()}`,
    `Tone: ${fields.tone.trim()}`,
    `Constraints: ${fields.constraints.trim()}`,
  ].join("\n");
}

function matchingTask(query: string, slug: string) {
  const text = query.toLowerCase();
  let best: (typeof tasks.tasks)[number] | null = null;
  let bestScore = 0;
  for (const task of tasks.tasks) {
    if (task.category !== slug) continue;
    let score = 0;
    for (const word of task.title.toLowerCase().split(/\s+/)) {
      if (word.length < 4) continue;
      const stem = word.slice(0, 4).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${stem}`, "i").test(text)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }
  return bestScore > 0 ? best : null;
}

export function templatePrompt(query: string, categoryKey: string) {
  if (!isCategoryKey(categoryKey)) return "";
  const category = models.categories[categoryKey];
  const task = matchingTask(query, category.slug);
  return assemblePrompt({
    role: `You are the assistant for this ${category.display_name.toLowerCase()} task.`,
    task: query.trim() || "[Say what you want done]",
    context: "[Add any files, examples, or details still needed]",
    format: "[Say what the answer should look like]",
    tone: "Plain and direct.",
    constraints: task?.starter_prompt || category.leader.starter_prompt,
  });
}

export function fieldValue(text: string, prefix: string) {
  const match = text.match(new RegExp(`^${prefix}:\\s*([\\s\\S]*?)(?=\\n[A-Z][^:\\n]{0,24}:|$)`, "m"));
  return match?.[1]?.trim() ?? "";
}

export function firstHint(text: string) {
  for (const item of CHECKS) {
    const value = fieldValue(text, item.prefix);
    if (!value || value.includes("[")) return item.hint;
  }
  return "";
}

export function tweakNotes(tweaks: string[]) {
  return tweaks
    .map((id) => TWEAKS.find((tweak) => tweak.id === id)?.hint)
    .filter(Boolean)
    .join(" ");
}
