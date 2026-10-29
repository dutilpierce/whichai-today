import Link from "next/link";
import { NewBadge } from "@/components/RelativeDay";
import { KIND_LABEL, STATUS_LABEL, monogram, providerHue, sourceHost, type Release } from "@/lib/releases";

const KIND_STYLE: Record<Release["kind"], string> = {
  model: "bg-emerald-500/15 text-emerald-300",
  update: "bg-zinc-800 text-zinc-300",
  feature: "bg-violet-500/15 text-violet-300",
  open_weights: "bg-sky-500/15 text-sky-300",
};

export type ReleaseRowData = Omit<Release, "evidence"> & { ranked: string | null };

export function ReleaseRow({ entry, anchor = false }: { entry: ReleaseRowData; anchor?: boolean }) {
  const hue = providerHue(entry.provider);
  const status = STATUS_LABEL[entry.status];
  const host = sourceHost(entry.source_url);

  return (
    <article
      id={anchor ? entry.id : undefined}
      className="flex scroll-mt-24 gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={{ backgroundColor: `hsl(${hue} 55% 45% / 0.18)`, color: `hsl(${hue} 85% 78%)` }}
      >
        {monogram(entry.provider)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold text-white">
            <Link href={`/releases/${entry.id}`} className="hover:text-emerald-200">
              {entry.name}
            </Link>
          </h3>
          <span className="text-sm text-zinc-500">{entry.provider}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[entry.kind]}`}>
            {KIND_LABEL[entry.kind]}
          </span>
          {status ? (
            <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-xs text-amber-200">{status}</span>
          ) : null}
          <NewBadge date={entry.date} />
        </div>
        <p className="mt-1.5 text-sm leading-6 text-zinc-300">{entry.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {entry.features.map((feature) => (
            <span key={feature} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-xs text-zinc-300">
              {feature}
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <a
            href={entry.source_url}
            target="_blank"
            rel="noopener"
            title={`Source: ${host}`}
            className="text-zinc-400 hover:text-white"
          >
            Source: {host} ↗
          </a>
          {entry.ranked ? (
            <Link href={`/models/${entry.ranked}`} className="text-zinc-400 hover:text-white">
              See where it ranks →
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
