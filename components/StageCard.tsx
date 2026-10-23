import type { ModelProfile } from "@/lib/match";

function Pick({
  model,
  label,
  featured = false,
}: {
  model: ModelProfile;
  label: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "rounded-xl border border-emerald-500 bg-zinc-950 p-4"
          : "rounded-xl border border-zinc-800 bg-zinc-950 p-4"
      }
    >
      <p
        className={
          featured
            ? "text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-400"
            : "text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-500"
        }
      >
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{model.name}</p>
      <p className="mt-1 text-xs text-zinc-400">{model.provider}</p>
      <a
        href={model.direct_link}
        target="_blank"
        rel="noopener"
        className="mt-3 inline-flex text-xs font-medium text-emerald-300 hover:text-emerald-200"
      >
        Open {model.provider}
      </a>
    </div>
  );
}

export function StageCard({
  index,
  stage,
  category,
}: {
  index: number;
  stage: { name: string; goal: string; action: string };
  category: {
    emoji: string;
    display_name: string;
    leader: ModelProfile;
    runner_up: ModelProfile;
    open_source_pick: ModelProfile;
  };
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Stage {index}
        </p>
        <p className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          {category.emoji} {category.display_name}
        </p>
      </div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
        {stage.name}
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-200">{stage.goal}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{stage.action}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Pick model={category.leader} label="#1" featured />
        <Pick model={category.runner_up} label="Alternative" />
        <Pick model={category.open_source_pick} label="Open source" />
      </div>
    </article>
  );
}
