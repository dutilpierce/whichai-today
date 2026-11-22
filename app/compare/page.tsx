import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ComparePicker } from "@/components/ComparePicker";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { MODALITY_LABEL, popularPairs, sharedPairs, tally, type ComparePairRecord } from "@/lib/compare";
import { trackedModels, type Modality } from "@/lib/pair-slugs";
import { rankingMonth } from "@/lib/picks";
import { pageGraph } from "@/lib/schema";

const title = "Compare AI models side by side";
const description =
  "Pick any two AI models and see who ranks ahead for coding, writing, research, images, and video, plus price, free tier, and privacy. Checked weekly.";

const metaTitle = `Compare AI Models: Claude vs GPT vs Gemini, Side by Side (${rankingMonth()})`;

export const metadata: Metadata = {
  title: metaTitle,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { title: metaTitle, description, url: "https://whichai.today/compare", siteName: "WhichAI.today", type: "website" },
  twitter: { card: "summary_large_image", title: metaTitle, description },
};

/** Scores within 1% of each other are flagged as a close race. */
const CLOSE_RACE = 0.01;

const MODALITY_ORDER: Modality[] = ["text", "image", "video"];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500";

function isCloseRace(leader: number | null, runnerUp: number | null) {
  if (leader == null || runnerUp == null || runnerUp === 0) return false;
  return Math.abs(leader - runnerUp) / Math.abs(runnerUp) < CLOSE_RACE;
}

function formatScore(score: number | null) {
  return score == null ? null : score.toLocaleString("en-US");
}

/** Jobs each side ranks ahead in, with the side that leads more of them. */
function fixture(record: ComparePairRecord) {
  const { a, b } = tally(record);
  return { a: a.length, b: b.length, ahead: a.length > b.length ? "a" : b.length > a.length ? "b" : null };
}

export default function CompareHub() {
  const popular = popularPairs();
  const options = trackedModels().sort((x, y) => x.name.localeCompare(y.name));
  const first = popular[0]?.record;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
  ];
  const pairs = sharedPairs();
  const groups = MODALITY_ORDER.map((modality) => ({
    modality,
    records: pairs
      .filter((record) => record.modality === modality)
      .sort((x, y) => {
        const fx = fixture(x);
        const fy = fixture(y);
        return fy.a + fy.b - (fx.a + fx.b) || x.a.name.localeCompare(y.a.name);
      }),
  })).filter((group) => group.records.length);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph("/compare", crumbs, [])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <Freshness path="/compare" />
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          See which of two models ranks ahead, job by job, with what each costs and whether it trains on your chats.
          Every model here is a current pick in at least one job.
        </p>

        <section aria-labelledby="picker-heading" className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <p id="picker-heading" className={eyebrow}>
            Build a matchup
          </p>
          <div className="mt-4">
            <ComparePicker
              models={options}
              initial={first ? [first.a.slug, first.b.slug] : [options[0].slug, options[1].slug]}
            />
          </div>
        </section>

        <section aria-labelledby="top-heading" className="mt-14">
          <h2 id="top-heading" className="text-2xl font-semibold tracking-tight text-white">
            Today&apos;s top matchups
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            The #1 pick against the alternative in each job, with the score each earns on that job&apos;s benchmark.
          </p>
          <ol className="mt-6 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {popular.map(({ record, category, emoji, signal, leader, runnerUp }) => {
              const close = isCloseRace(leader.score, runnerUp.score);
              return (
                <li key={record.pair}>
                  <Link
                    href={`/compare/${record.pair}`}
                    className="group grid gap-x-6 gap-y-2 px-5 py-4 transition hover:bg-zinc-950/60 sm:grid-cols-[12rem_1fr_auto] sm:items-center"
                  >
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="text-base">
                        {emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">{category}</p>
                        <p className="truncate text-xs text-zinc-500">{signal}</p>
                      </div>
                    </div>

                    <div className="min-w-0 text-sm">
                      <p className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="rounded-full bg-emerald-500 px-1.5 py-px text-[10px] font-bold text-zinc-950">
                          #1
                        </span>
                        <span className="font-semibold text-white">{leader.name}</span>
                        {formatScore(leader.score) && (
                          <span className="font-mono text-xs text-zinc-400">{formatScore(leader.score)}</span>
                        )}
                        {close && (
                          <span className="ml-1 rounded-full border border-amber-400/40 px-2 py-px text-[11px] font-medium text-amber-200">
                            Close race
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-zinc-400">
                        <span className="text-xs text-zinc-500">vs</span>
                        <span>{runnerUp.name}</span>
                        {formatScore(runnerUp.score) && (
                          <span className="font-mono text-xs text-zinc-500">{formatScore(runnerUp.score)}</span>
                        )}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="hidden text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300 sm:block"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="all-heading" className="mt-14">
          <h2 id="all-heading" className="text-2xl font-semibold tracking-tight text-white">
            Every head-to-head
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {pairs.length} matchups. The tally counts the jobs where each model ranks ahead. Image and video models are
            only compared with their own kind.
          </p>

          {groups.map((group) => (
            <FixtureList key={group.modality} modality={group.modality} records={group.records} />
          ))}
        </section>
      </main>
    </div>
  );
}

function FixtureList({ modality, records }: { modality: Modality; records: ComparePairRecord[] }) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={eyebrow}>{MODALITY_LABEL[modality]}</h3>
        <span className="text-xs text-zinc-500">{records.length}</span>
      </div>
      <ul className="mt-3 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {records.map((record) => {
          const score = fixture(record);
          const side = (which: "a" | "b") =>
            score.ahead === which ? "font-semibold text-white" : score.ahead ? "text-zinc-400" : "text-zinc-200";
          return (
            <li key={record.pair}>
              <Link
                href={`/compare/${record.pair}`}
                aria-label={`${record.a.name} vs ${record.b.name}: ${score.a} to ${score.b} jobs ahead`}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 text-sm transition hover:bg-zinc-950/60"
              >
                <span className="min-w-0 text-right">
                  <span className={`block ${side("a")}`}>{record.a.name}</span>
                  <span className="block text-xs text-zinc-500">{record.a.provider}</span>
                </span>
                <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 font-mono text-xs tabular-nums text-zinc-300">
                  <span className={score.ahead === "a" ? "font-bold text-white" : ""}>{score.a}</span>
                  <span className="px-1 text-zinc-500">–</span>
                  <span className={score.ahead === "b" ? "font-bold text-white" : ""}>{score.b}</span>
                </span>
                <span className="min-w-0">
                  <span className={`block ${side("b")}`}>{record.b.name}</span>
                  <span className="block text-xs text-zinc-500">{record.b.provider}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
