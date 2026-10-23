import type { ModelProfile } from "@/lib/match";

export function ModelCard({
  model,
  label,
  featured = false,
}: {
  model: ModelProfile;
  label: string;
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "rounded-2xl border-2 border-emerald-500 bg-zinc-900 p-8"
          : "rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      }
    >
      <p
        className={
          featured
            ? "text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400"
            : "text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400"
        }
      >
        {label}
      </p>
      <h2
        className={
          featured
            ? "mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            : "mt-3 text-xl font-semibold tracking-tight text-white"
        }
      >
        {model.name}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{model.provider}</p>
      <p className="mt-4 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
        {model.badge}
      </p>
      <p className="mt-4 text-base leading-7 text-zinc-200">{model.why}</p>
      <p className="mt-3 text-xs text-zinc-500">{model.benchmark_context}</p>
      <a
        href={model.direct_link}
        target="_blank"
        rel="noopener"
        className={
          featured
            ? "mt-6 inline-flex rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            : "mt-6 inline-flex rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-emerald-500 hover:text-white"
        }
      >
        Open {model.provider}
      </a>
    </article>
  );
}
