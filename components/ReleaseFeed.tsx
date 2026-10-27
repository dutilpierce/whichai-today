import { RelativeDay } from "@/components/RelativeDay";
import { ReleaseRow, type ReleaseRowData } from "@/components/ReleaseRow";
import { groupByDay } from "@/lib/releases";

const MOBILE_ROWS = 5;

export function ReleaseDays({
  entries,
  anchor = false,
  live = true,
  mobileRows,
}: {
  entries: ReleaseRowData[];
  anchor?: boolean;
  live?: boolean;
  mobileRows?: number;
}) {
  const days = groupByDay(entries);
  const starts = days.map((_, dayIndex) => days.slice(0, dayIndex).reduce((total, day) => total + day.entries.length, 0));
  return (
    <ol className="relative mt-6 flex flex-col gap-6 border-l border-zinc-800 pl-6">
      {days.map((day, dayIndex) => {
        const first = starts[dayIndex];
        const hiddenOnMobile = mobileRows !== undefined && first >= mobileRows;
        return (
          <li key={day.date} className={hiddenOnMobile ? "relative hidden sm:block" : "relative"}>
            <span
              aria-hidden
              className={
                live && dayIndex === 0
                  ? "whichai-pulse absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-emerald-400"
                  : "absolute -left-[30px] top-1 h-3 w-3 rounded-full border-2 border-zinc-600 bg-zinc-950"
              }
            />
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <RelativeDay date={day.date} className={live && dayIndex === 0 ? "text-emerald-300" : undefined} />
              <span className="text-zinc-500">
                {" "}· {day.entries.length} {day.entries.length === 1 ? "release" : "releases"}
              </span>
            </h3>
            <ul className="mt-3 flex flex-col gap-3">
              {day.entries.map((entry, rowIndex) => (
                <li
                  key={entry.id}
                  className={mobileRows !== undefined && first + rowIndex >= mobileRows ? "hidden sm:block" : undefined}
                >
                  <ReleaseRow entry={entry} anchor={anchor} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function ReleaseFeed({ entries }: { entries: ReleaseRowData[] }) {
  if (!entries.length) return null;
  return (
    <section aria-labelledby="latest-releases" className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="latest-releases" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Latest AI releases
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            What AI companies just shipped, newest first. Checked every 6 hours.
          </p>
        </div>
        <a href="/releases" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">
          See full timeline →
        </a>
      </div>
      <ReleaseDays entries={entries} mobileRows={MOBILE_ROWS} />
      <p className="mt-6 text-sm">
        <a href="/releases" className="text-zinc-300 hover:text-white">
          All releases, filters, and the RSS feed →
        </a>
      </p>
    </section>
  );
}
