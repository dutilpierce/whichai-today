"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { slug: string; name: string; modality: string };

const GROUP: Record<string, string> = { text: "Chat and text", image: "Image", video: "Video" };

export function ComparePicker({ models, initial }: { models: Option[]; initial: [string, string] }) {
  const router = useRouter();
  const [left, setLeft] = useState(initial[0]);
  const [right, setRight] = useState(initial[1]);
  const kind = models.find((model) => model.slug === left)?.modality;
  const others = models.filter((model) => model.modality === kind && model.slug !== left);
  const target = others.some((model) => model.slug === right) ? right : others[0]?.slug;

  const groups = Object.keys(GROUP).map((group) => ({
    group,
    items: models.filter((model) => model.modality === group),
  }));
  const select =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none";

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (!target) return;
        router.push(`/compare/${[left, target].sort().join("-vs-")}`);
      }}
    >
      <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
        First model
        <select className={select} value={left} onChange={(event) => setLeft(event.target.value)}>
          {groups.map(({ group, items }) => (
            <optgroup key={group} label={GROUP[group]}>
              {items.map((model) => (
                <option key={model.slug} value={model.slug}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <span className="hidden pb-2.5 text-sm text-zinc-500 sm:block">vs</span>
      <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
        Second model
        <select className={select} value={target ?? ""} onChange={(event) => setRight(event.target.value)}>
          {others.map((model) => (
            <option key={model.slug} value={model.slug}>
              {model.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
      >
        Compare
      </button>
    </form>
  );
}
