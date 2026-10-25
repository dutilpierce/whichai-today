"use client";

import { OPTION_APPS, type Choice, type Priority } from "@/lib/options";

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "quality", label: "Best quality" },
  { id: "cost", label: "Lowest cost" },
  { id: "private", label: "Most private" },
];

export function OptionsPanel({
  choice,
  onChange,
}: {
  choice: Choice;
  onChange: (next: Choice) => void;
}) {
  return (
    <details className="mt-3 text-sm text-zinc-300">
      <summary className="cursor-pointer font-medium text-zinc-300 hover:text-white">Options</summary>
      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">I use / pay for</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OPTION_APPS.map((app) => {
              const selected = !choice.freeOnly && choice.apps.includes(app.slug);
              return (
                <button
                  key={app.slug}
                  type="button"
                  onClick={() => {
                    const apps = selected
                      ? choice.apps.filter((slug) => slug !== app.slug)
                      : [...choice.apps, app.slug];
                    onChange({ ...choice, apps, freeOnly: false });
                  }}
                  className={
                    selected
                      ? "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950"
                      : "rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
                  }
                >
                  {app.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onChange({ ...choice, apps: [], freeOnly: !choice.freeOnly })}
              className={
                choice.freeOnly
                  ? "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950"
                  : "rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
              }
            >
              Free only
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Optimize for</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIORITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ ...choice, priority: item.id })}
                className={
                  choice.priority === item.id
                    ? "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950"
                    : "rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
