import type { ReactNode } from "react";
import providers from "@/lib/providers.json";
import models from "@/lib/models.json";
import { held } from "@/lib/held";
import { ACCESS_LABEL, formatDay, leaderBadge } from "@/lib/picks";
import type { ModelProfile } from "@/lib/match";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-zinc-300">{children}</dd>
    </div>
  );
}

export function ModelCard({
  model,
  label,
  signal,
  featured = false,
}: {
  model: ModelProfile;
  label: string;
  signal?: string;
  featured?: boolean;
}) {
  const privacy = providers[model.provider as keyof typeof providers];
  const privacyHeld = held.facts.some(
    (fact) => fact.kind === "privacy" && fact.provider === model.provider,
  );
  const costHeld = held.facts.some(
    (fact) => fact.kind === "cost" && fact.model === model.name,
  );
  const showChecked = model.checked.slice(0, 10) !== models.last_updated.slice(0, 10);
  const badge = featured && signal ? leaderBadge(model.sources_agreeing, signal) : null;

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
      <p className="mt-3 text-sm leading-6 text-zinc-200">{model.where_to_get}</p>
      <p className="mt-2 inline-block rounded-full border border-zinc-700 px-2.5 py-0.5 text-[0.7rem] font-medium text-zinc-300">
        {ACCESS_LABEL[model.access as keyof typeof ACCESS_LABEL] ?? model.access}
      </p>
      {badge ? (
        <p className="mt-4 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          {badge}
        </p>
      ) : null}
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
      <details className="mt-6 border-t border-zinc-800 pt-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300 hover:text-white">
          Details
        </summary>
        <dl className="mt-4 flex flex-col gap-4">
          <Detail label="Why it leads">
            {model.benchmark_context}{" "}
            <a href={model.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
              Source
            </a>
            {showChecked ? `. Checked ${formatDay(model.checked)}.` : "."}
          </Detail>
          <Detail label="Cost">
            {costHeld ? (
              <>
                Being re-checked.{" "}
                <a href={model.direct_link} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                  Provider page
                </a>
              </>
            ) : (
              model.cost
            )}
          </Detail>
          <Detail label="Free tier">{costHeld ? "Being re-checked." : model.free_tier}</Detail>
          <Detail label="Privacy default">
            {privacyHeld ? (
              <>
                Being re-checked.{" "}
                {privacy ? (
                  <a href={privacy.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                    Provider page
                  </a>
                ) : null}
              </>
            ) : privacy ? (
              <>
                {privacy.trains_by_default} {privacy.opt_out}{" "}
                <a href={privacy.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                  Source
                </a>
              </>
            ) : (
              "Privacy default not checked for this provider yet."
            )}
          </Detail>
          <Detail label="When not to use it">{model.when_not}</Detail>
          <Detail label="Starter prompt">{model.starter_prompt}</Detail>
        </dl>
      </details>
    </article>
  );
}
