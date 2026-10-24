import { pageDates } from "@/lib/freshness";
import { formatDay } from "@/lib/picks";

export function Freshness({ path }: { path: string }) {
  const { changed, checked } = pageDates(path);
  return (
    <p className="mt-3 text-sm text-zinc-400">
      Updated {formatDay(changed)}. Checked daily.
      {checked !== changed ? ` Last checked ${formatDay(checked)}.` : null}
    </p>
  );
}
