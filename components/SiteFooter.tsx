import models from "@/lib/models.json";
import { formatDay } from "@/lib/picks";

export function SiteFooter({ includeChanges = false }: { includeChanges?: boolean }) {
  const reviewed = formatDay(models.last_updated);
  const categories = Object.values(models.categories);

  return (
    <footer className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 text-xs text-zinc-500">
      <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Categories">
        {categories.map((category) => (
          <a
            key={category.slug}
            href={`/${category.slug}`}
            className="text-zinc-400 hover:text-white"
          >
            {category.emoji} {category.display_name}
          </a>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          Rankings compiled from LMArena, Artificial Analysis, Vals AI, and
          SWE-bench, last reviewed {reviewed}.
        </p>
        <nav className="flex items-center gap-4" aria-label="Site">
          <a href="/alerts" className="text-zinc-400 hover:text-white">
            Get alerts
          </a>
          {includeChanges ? (
            <a href="/changes" className="text-zinc-400 hover:text-white">
              Changes
            </a>
          ) : null}
          <a href="/data" className="text-zinc-400 hover:text-white">
            Data
          </a>
          <a href="/about" className="text-zinc-400 hover:text-white">
            About
          </a>
          <a href="/privacy" className="text-zinc-400 hover:text-white">
            Privacy
          </a>
        </nav>
      </div>
    </footer>
  );
}
