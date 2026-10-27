"use client";

import { useSyncExternalStore } from "react";
import { ReleaseDays } from "@/components/ReleaseFeed";
import type { ReleaseRowData } from "@/components/ReleaseRow";

const KINDS = [
  ["all", "All"],
  ["model", "New models"],
  ["update", "Updates"],
  ["feature", "Features"],
  ["open_weights", "Open weights"],
] as const;

type KindFilter = (typeof KINDS)[number][0];

const tabRest = "rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white";
const tabSelected = "rounded-full border border-emerald-400/70 bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-200";

function monthLabel(date: string) {
  return new Date(`${date.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const FILTER_EVENT = "whichai-release-filter";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(FILTER_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(FILTER_EVENT, onChange);
  };
}

// Filters live in the URL so a filtered view can be shared; the server always renders every release.
function useSearch() {
  return useSyncExternalStore(subscribe, () => window.location.search, () => "");
}

export function ReleaseTimeline({ entries }: { entries: ReleaseRowData[] }) {
  const params = new URLSearchParams(useSearch());
  const requested = params.get("kind");
  const kind = (KINDS.some(([value]) => value === requested) ? requested : "all") as KindFilter;
  const provider = params.get("provider");

  function update(nextKind: KindFilter, nextProvider: string | null) {
    const next = new URLSearchParams();
    if (nextKind !== "all") next.set("kind", nextKind);
    if (nextProvider) next.set("provider", nextProvider);
    const search = next.toString();
    window.history.replaceState(null, "", `/releases${search ? `?${search}` : ""}${window.location.hash}`);
    window.dispatchEvent(new Event(FILTER_EVENT));
  }

  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.provider, (counts.get(entry.provider) ?? 0) + 1);
  const providers = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);

  const shown = entries.filter(
    (entry) => (kind === "all" || entry.kind === kind) && (!provider || entry.provider === provider),
  );
  const months: { month: string; entries: ReleaseRowData[] }[] = [];
  for (const entry of shown) {
    const month = entry.date.slice(0, 7);
    const last = months.at(-1);
    if (last && last.month === month) last.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          {KINDS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => update(value, provider)}
              className={kind === value ? tabSelected : tabRest}
            >
              {label}
            </button>
          ))}
        </div>
        {providers.length > 1 ? (
          <div role="group" aria-label="Filter by company" className="flex flex-wrap gap-1.5">
            {providers.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={provider === name}
                onClick={() => update(kind, provider === name ? null : name)}
                className={
                  provider === name
                    ? "rounded-md border border-emerald-400/70 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200"
                    : "rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
                }
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-zinc-500" role="status">
          {shown.length} of {entries.length} releases
        </p>
      </div>

      {months.length ? (
        months.map((group, index) => (
          <section key={group.month} className="mt-10">
            <h2 className="text-lg font-semibold text-white">{monthLabel(group.month)}</h2>
            <ReleaseDays entries={group.entries} anchor live={index === 0} />
          </section>
        ))
      ) : (
        <p className="mt-10 text-base leading-7 text-zinc-300">Nothing matches these filters yet.</p>
      )}
    </>
  );
}
