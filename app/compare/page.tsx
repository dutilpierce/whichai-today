import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ComparePicker } from "@/components/ComparePicker";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { currentModels } from "@/lib/catalog";
import { MODALITY_LABEL, pairsWith, popularPairs, sharedPairs, tally } from "@/lib/compare";
import { trackedModels } from "@/lib/pair-slugs";
import { pageGraph } from "@/lib/schema";

const title = "Compare AI models side by side";
const description =
  "Pick any two AI models and see who ranks ahead for coding, writing, research, images, and video, plus price, free tier, and privacy. Checked daily.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { title, description, url: "https://whichai.today/compare", siteName: "WhichAI.today", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function CompareHub() {
  const popular = popularPairs();
  const options = trackedModels().sort((x, y) => x.name.localeCompare(y.name));
  const first = popular[0]?.record;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
  ];
  const byModel = currentModels()
    .map((model) => ({ model, pairs: pairsWith(model.slug, undefined, 50) }))
    .filter((entry) => entry.pairs.length)
    .sort((x, y) => x.model.name.localeCompare(y.model.name));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph("/compare", crumbs, [])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <Freshness path="/compare" />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Every model here is a current pick in at least one job. Choose two of the same kind and see which ranks ahead,
          job by job, with what each costs and whether it trains on your chats.
        </p>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <ComparePicker models={options} initial={first ? [first.a.slug, first.b.slug] : [options[0].slug, options[1].slug]} />
        </section>

        <h2 className="mt-12 text-2xl font-semibold text-white">Today&apos;s top matchups</h2>
        <p className="mt-2 text-sm text-zinc-400">The #1 against the alternative in each job.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {popular.map(({ record, category, leader }) => {
            const shared = tally(record).shared.length;
            return (
              <li key={record.pair}>
                <Link
                  href={`/compare/${record.pair}`}
                  className="block h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{category}</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {record.a.name} <span className="font-normal text-zinc-500">vs</span> {record.b.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {leader} is #1 here. Ranked against each other in {shared} {shared === 1 ? "job" : "jobs"}.
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-12 text-2xl font-semibold text-white">Every comparison</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {sharedPairs().length} head-to-heads. {Object.values(MODALITY_LABEL).join(", ")} are only compared with their
          own kind.
        </p>
        <div className="mt-6 flex flex-col gap-8">
          {byModel.map(({ model, pairs }) => (
            <section key={model.slug}>
              <h3 className="text-base font-semibold text-white">
                <Link href={`/models/${model.slug}`} className="hover:text-emerald-200">
                  {model.name}
                </Link>{" "}
                <span className="text-sm font-normal text-zinc-500">{model.provider}</span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {pairs.map(({ record, other }) => (
                  <li key={record.pair}>
                    <Link
                      href={`/compare/${record.pair}`}
                      className="inline-block rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
                    >
                      vs {other.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
