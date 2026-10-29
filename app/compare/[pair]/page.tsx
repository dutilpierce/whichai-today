import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqList } from "@/components/FaqList";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { appsOffering, offerFor, planPrice } from "@/lib/apps";
import {
  comparePairs,
  pairBySlug,
  pairHistory,
  pairsWith,
  releaseFor,
  tally,
  verdictLine,
  type Cell,
  type CompareSide,
  type ComparePairRecord,
} from "@/lib/compare";
import models from "@/lib/models.json";
import { ACCESS_LABEL, formatDay, historyBlurb } from "@/lib/picks";
import { compareFaqs, faqNode, pageGraph } from "@/lib/schema";
import providers from "@/lib/providers.json";

export function generateStaticParams() {
  return comparePairs().map((record) => ({ pair: record.pair }));
}

function monthLabel() {
  return new Date(models.last_updated).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function describe(record: ComparePairRecord) {
  const { a, b } = tally(record);
  const total = record.rows.length;
  const lead =
    a.length === b.length
      ? `${record.a.name} and ${record.b.name} split ${total} jobs we track`
      : a.length > b.length
        ? `${record.a.name} ranks ahead in ${a.length} of ${total} jobs we track`
        : `${record.b.name} ranks ahead in ${b.length} of ${total} jobs we track`;
  return `${lead}. Benchmarks, price, free tier, and privacy side by side, checked daily.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const record = pairBySlug(pair);
  if (!record) return {};
  const title = `${record.a.name} vs ${record.b.name}: Which Is Better? (${monthLabel()})`;
  const description = describe(record);
  const url = `https://whichai.today/compare/${pair}`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${pair}` },
    robots: record.indexed ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const label = "text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500";

function RankBadge({ cell }: { cell: Cell }) {
  if (!cell) return <span className="text-xs text-zinc-500">Not in top 3</span>;
  const style =
    cell.rank === 1
      ? "bg-emerald-500/15 text-emerald-300"
      : cell.rank === 2
        ? "bg-zinc-800 text-zinc-200"
        : "bg-sky-500/15 text-sky-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{cell.label}</span>;
}

function ScoreBar({ cell, top, win }: { cell: Cell; top: number | null; win: boolean }) {
  if (!cell || cell.score === null || !top) return null;
  const width = Math.max(8, Math.round((cell.score / top) * 100));
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
        <div
          className={`h-1.5 rounded-full ${win ? "bg-emerald-400" : "bg-zinc-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums ${win ? "text-emerald-300" : "text-zinc-400"}`}>{cell.score}</span>
    </div>
  );
}

function Scoreboard({ record }: { record: ComparePairRecord }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">
      <div className="grid grid-cols-[1fr_1fr] gap-x-4 border-b border-zinc-800 bg-zinc-900 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        <span className={`${label} hidden sm:block`}>Job</span>
        <span className={label}>{record.a.name}</span>
        <span className={label}>{record.b.name}</span>
      </div>
      {record.rows.map((row) => {
        const scores = [row.a?.score, row.b?.score].filter((score): score is number => typeof score === "number");
        const top = scores.length ? Math.max(...scores) : null;
        return (
          <div key={row.key} className="border-b border-zinc-800/70 px-4 py-4 last:border-b-0">
            <Link href={`/${row.slug}`} className="text-sm font-medium text-zinc-100 hover:text-white sm:hidden">
              {row.emoji} {row.display_name}
            </Link>
            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-x-4 sm:mt-0 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-start">
              <div className="hidden sm:block">
                <Link href={`/${row.slug}`} className="text-sm font-medium text-zinc-100 hover:text-white">
                  {row.emoji} {row.display_name}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">{row.signal}</p>
              </div>
              {(["a", "b"] as const).map((side) => (
                <div key={side} className={row.winner === side ? "" : "opacity-80"}>
                  <div className="flex flex-wrap items-center gap-2">
                    <RankBadge cell={row[side]} />
                    {row.winner === side ? <span className="text-xs text-emerald-300">Ahead</span> : null}
                  </div>
                  <ScoreBar cell={row[side]} top={top} win={row.winner === side} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PickCard({ model }: { model: CompareSide }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-lg font-semibold text-white">
        <Link href={`/models/${model.slug}`} className="hover:text-emerald-200">
          {model.name}
        </Link>
      </h3>
      <p className="mt-0.5 text-sm text-zinc-500">{model.provider}</p>
      <p className="mt-4 text-sm leading-6 text-zinc-200">{model.profile.pick_if}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{model.profile.when_not}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{model.profile.benchmark_context}</p>
    </article>
  );
}

function FactRow({ name, left, right }: { name: string; left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-zinc-800/70 px-4 py-4 last:border-b-0 sm:grid-cols-[0.8fr_1fr_1fr]">
      <span className={label}>{name}</span>
      <div className="text-sm leading-6 text-zinc-300">{left}</div>
      <div className="text-sm leading-6 text-zinc-300">{right}</div>
    </div>
  );
}

function privacyFor(provider: string) {
  return providers[provider as keyof typeof providers];
}

function Apps({ model }: { model: CompareSide }) {
  const apps = appsOffering(model.name);
  if (!apps.length) return <span className="text-zinc-500">{model.profile.where_to_get}</span>;
  return (
    <ul className="flex flex-col gap-1">
      {apps.map((app) => {
        const offer = offerFor(app, model.name);
        return (
          <li key={app.slug}>
            <Link href={`/apps/${app.slug}`} className="text-emerald-300 hover:text-emerald-200">
              {app.name}
            </Link>
            {offer.plan ? `, ${offer.plan.name} (${planPrice(offer.plan.price_usd_month)})` : ""}
          </li>
        );
      })}
    </ul>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const record = pairBySlug(pair);
  if (!record) notFound();

  const { a, b } = record;
  const score = tally(record);
  const released = { a: releaseFor(a.name), b: releaseFor(b.name) };
  const faqs = compareFaqs(record, privacyFor, { a: released.a?.date ?? null, b: released.b?.date ?? null });
  const log = pairHistory(record);
  const related = [...pairsWith(a.slug, pair, 4), ...pairsWith(b.slug, pair, 4)];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
    { name: `${a.name} vs ${b.name}`, path: `/compare/${pair}` },
  ];
  const leftPrivacy = privacyFor(a.provider);
  const rightPrivacy = privacyFor(b.provider);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(`/compare/${pair}`, crumbs, [faqNode(faqs)])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {a.name} vs {b.name}
        </h1>
        <Freshness path={`/compare/${pair}`} />

        <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className={label}>The short answer</p>
          <p className="mt-2 text-base leading-7 text-zinc-100">{verdictLine(record)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([["a", a, score.a.length], ["b", b, score.b.length]] as const).map(([side, model, wins]) => (
              <div key={side} className="rounded-xl bg-zinc-950/60 p-3">
                <p className="text-sm font-medium text-white">{model.name}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
                  {wins}
                  <span className="text-sm font-normal text-zinc-500">
                    {" "}
                    of {record.rows.length} {record.rows.length === 1 ? "job" : "jobs"} ahead
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {ACCESS_LABEL[model.profile.access as keyof typeof ACCESS_LABEL] ?? model.profile.access}
                </p>
              </div>
            ))}
          </div>
          {!score.shared.length ? (
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              These two are never ranked in the same job, so each &quot;ahead&quot; means only one of them is a current
              top-three pick there.
            </p>
          ) : null}
        </section>

        <h2 className="mt-12 text-2xl font-semibold text-white">Head to head, job by job</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Each job ranks a #1, an alternative, and an open-weights pick from public leaderboards. Bars compare the two
          scores on that job&apos;s own signal.
        </p>
        <Scoreboard record={record} />

        <h2 className="mt-12 text-2xl font-semibold text-white">Which one should you pick?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PickCard model={a} />
          <PickCard model={b} />
        </div>

        <h2 className="mt-12 text-2xl font-semibold text-white">Price, access, and privacy</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="hidden gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 sm:grid sm:grid-cols-[0.8fr_1fr_1fr]">
            <span />
            <span className={label}>{a.name}</span>
            <span className={label}>{b.name}</span>
          </div>
          <FactRow name="Cost" left={a.profile.cost} right={b.profile.cost} />
          <FactRow name="Free tier" left={a.profile.free_tier} right={b.profile.free_tier} />
          <FactRow
            name="Where to get it"
            left={
              <a href={a.profile.direct_link} target="_blank" rel="noopener" className="hover:text-white">
                {a.profile.where_to_get}
              </a>
            }
            right={
              <a href={b.profile.direct_link} target="_blank" rel="noopener" className="hover:text-white">
                {b.profile.where_to_get}
              </a>
            }
          />
          <FactRow name="Apps" left={<Apps model={a} />} right={<Apps model={b} />} />
          <FactRow
            name="Trains on chats"
            left={leftPrivacy ? `${leftPrivacy.trains_by_default} ${leftPrivacy.opt_out}` : "Not checked yet."}
            right={rightPrivacy ? `${rightPrivacy.trains_by_default} ${rightPrivacy.opt_out}` : "Not checked yet."}
          />
          <FactRow
            name="Released"
            left={
              released.a ? (
                <Link href={`/releases/${released.a.id}`} className="text-emerald-300 hover:text-emerald-200">
                  {formatDay(released.a.date)}
                </Link>
              ) : (
                "Before our release log began."
              )
            }
            right={
              released.b ? (
                <Link href={`/releases/${released.b.id}`} className="text-emerald-300 hover:text-emerald-200">
                  {formatDay(released.b.date)}
                </Link>
              ) : (
                "Before our release log began."
              )
            }
          />
        </div>

        <h2 className="mt-12 text-2xl font-semibold text-white">Try both with the same prompt</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[a, b].map((model) => (
            <div key={model.slug} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className={label}>{model.name}</p>
              <p className="mt-2 font-mono text-sm leading-6 text-zinc-200">{model.profile.starter_prompt}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Want a sharper prompt?{" "}
          <Link href="/prompt-builder" className="text-emerald-300 hover:text-emerald-200">
            Build one for either model
          </Link>
          .
        </p>

        {log.length ? (
          <>
            <h2 className="mt-12 text-2xl font-semibold text-white">Ranking history</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {log.map((entry) => (
                <li key={`${entry.date}-${entry.category}-${entry.leader}`} className="text-sm leading-6 text-zinc-300">
                  <span className="text-white">{formatDay(entry.date)}. </span>
                  {historyBlurb(entry)}
                  {entry.evidence}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <FaqList faqs={faqs} />

        {related.length ? (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-white">More comparisons</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {related.map(({ record: other }) => (
                <li key={other.pair}>
                  <Link
                    href={`/compare/${other.pair}`}
                    className="block rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
                  >
                    {other.a.name} vs {other.b.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <Link href="/compare" className="text-emerald-300 hover:text-emerald-200">
                Compare any two models →
              </Link>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
