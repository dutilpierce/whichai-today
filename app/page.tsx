"use client";

import { FormEvent, useRef, useState } from "react";
import { ModelCard } from "@/components/ModelCard";
import { matchCategory } from "@/lib/match";
import models from "@/lib/models.json";

const updatedLabel = new Date(models.last_updated).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const categories = Object.entries(models.categories);

export default function Home() {
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  function showCategory(key: string) {
    requestId.current += 1;
    setLoading(false);
    setCategoryKey(key);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    const key = matchCategory(query);
    if (key) {
      showCategory(key);
      return;
    }

    const id = ++requestId.current;
    setCategoryKey(null);
    setLoading(true);
    let next = "general";
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data?.category in models.categories) next = data.category;
    } catch {}
    if (id !== requestId.current) return;
    setLoading(false);
    setCategoryKey(next);
  }

  const category = categoryKey
    ? models.categories[categoryKey as keyof typeof models.categories]
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <style>{`@keyframes whichai-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-8">
        <p className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Updated {updatedLabel}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-12 pt-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          The best AI changes depending on the job.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          Models leapfrog each other all the time, and not in the same category.
          The leader for coding is often not the leader for writing, legal work,
          math, or speed.
        </p>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Describe what you are working on. You will get today&apos;s top pick, a
          strong alternative, and the best open option.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What are you working on right now?"
            aria-label="What are you working on right now?"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-lg text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Find
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map(([key, item]) => {
            const selected = key === categoryKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => showCategory(key)}
                className={
                  selected
                    ? "rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-white"
                    : "rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-500"
                }
              >
                {item.emoji} {item.display_name}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="mt-10 text-sm text-zinc-400">Finding the best fit…</p>
        )}

        {category && (
          <section
            className="mt-10 flex flex-col gap-4"
            style={{ animation: "whichai-fade 0.35s ease" }}
          >
            <p className="text-sm font-medium text-zinc-400">
              {category.emoji} {category.display_name}
            </p>
            <ModelCard model={category.leader} label="#1 Champion" featured />
            <div className="grid gap-4 md:grid-cols-2">
              <ModelCard model={category.runner_up} label="Top Alternative" />
              <ModelCard
                model={category.open_source_pick}
                label="Best Open Source"
              />
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-xs text-zinc-500">
        Rankings compiled from LMArena, Artificial Analysis, Vals AI, and
        SWE-bench, last reviewed {updatedLabel}.
      </footer>
    </div>
  );
}
