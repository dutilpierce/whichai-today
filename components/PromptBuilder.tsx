"use client";

import { useState } from "react";
import { PromptPanel } from "@/components/PromptPanel";
import { matchCategory } from "@/lib/match";
import models from "@/lib/models.json";

const EXAMPLES = [
  "Debug a function and explain the cause",
  "Review a contract and flag the risky clauses",
  "Write a cover letter for a job",
  "Explain a concept so I can study it",
  "Summarize meeting notes into decisions",
  "Plan a weekend trip with a budget",
];

export function PromptBuilder() {
  const [expert, setExpert] = useState(false);
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [target, setTarget] = useState("");

  const categoryKey = matchCategory(goal) ?? "general";
  const category = models.categories[categoryKey as keyof typeof models.categories];
  const names = new Map<string, { provider: string; href: string }>();
  for (const item of Object.values(models.categories)) {
    for (const pick of [item.leader, item.runner_up, item.open_source_pick]) {
      if (!names.has(pick.name)) names.set(pick.name, { provider: pick.provider, href: pick.direct_link });
    }
  }
  const chosen = target ? names.get(target) : undefined;
  const modelName = chosen ? target : category.leader.name;
  const provider = chosen?.provider ?? category.leader.provider;
  const href = chosen?.href ?? category.leader.direct_link;
  const query = [
    goal.trim(),
    expert && context.trim() ? `Context: ${context.trim()}` : "",
    expert && format.trim() ? `Output format: ${format.trim()}` : "",
    expert && tone.trim() ? `Tone: ${tone.trim()}` : "",
    expert && language.trim() ? `Language: ${language.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mt-8">
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => setExpert(false)} className={expert ? "text-zinc-400" : "font-semibold text-white"}>
          Simple
        </button>
        <button type="button" onClick={() => setExpert(true)} className={expert ? "font-semibold text-white" : "text-zinc-400"}>
          Expert
        </button>
      </div>
      <label className="mt-4 block text-sm text-zinc-300">
        What do you want to get done?
        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-500"
        />
      </label>
      {expert ? (
        <div className="mt-4 grid gap-3">
          <Field label="Context" value={context} onChange={setContext} />
          <Field label="Output format" value={format} onChange={setFormat} />
          <Field label="Tone" value={tone} onChange={setTone} />
          <Field label="Language" value={language} onChange={setLanguage} />
          <label className="text-sm text-zinc-300">
            Target
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white"
            >
              <option value="">Today&apos;s best for this</option>
              {[...names.keys()].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setGoal(example)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-emerald-500"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {query ? (
          <p className="mb-2 text-xs text-zinc-500">
            {chosen ? modelName : `${modelName}, today's best for this`}
          </p>
        ) : null}
        <PromptPanel
          query={query}
          categoryKey={categoryKey}
          modelName={modelName}
          provider={provider}
          href={href}
          primary
          disabled={!query}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-zinc-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
      />
    </label>
  );
}
