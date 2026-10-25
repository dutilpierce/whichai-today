import { CategoryLinks } from "@/components/CategoryLinks";
import models from "@/lib/models.json";
import { formatDay } from "@/lib/picks";

export function SiteFooter({ includeChanges = false }: { includeChanges?: boolean }) {
  const reviewed = formatDay(models.last_updated);

  return (
    <footer className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 text-xs text-zinc-500">
      <CategoryLinks />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          Rankings compiled from LMArena, Artificial Analysis, Vals AI, and
          SWE-bench, last reviewed {reviewed}. No affiliate links. No paid placement.
        </p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Site">
          <a href="/about" className="text-zinc-400 hover:text-white">
            About
          </a>
          <a href="/privacy" className="text-zinc-400 hover:text-white">
            Privacy
          </a>
          <a href="/methodology" className="text-zinc-400 hover:text-white">
            Methodology
          </a>
          <a href="/data" className="text-zinc-400 hover:text-white">
            Data
          </a>
          {includeChanges ? (
            <a href="/changes" className="text-zinc-400 hover:text-white">
              Changes
            </a>
          ) : null}
          <a href="/alerts" className="text-zinc-400 hover:text-white">
            Get alerts
          </a>
          <a href="/suggest" className="text-zinc-400 hover:text-white">
            Suggest
          </a>
          <a href="/embed" className="text-zinc-400 hover:text-white">
            Embed
          </a>
        </nav>
      </div>
    </footer>
  );
}
