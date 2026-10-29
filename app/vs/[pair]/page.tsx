import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { appList, planPrice, type AppRecord } from "@/lib/apps";
import { categoryEntries } from "@/lib/picks";
import { pageGraph } from "@/lib/schema";
import pairsFile from "@/lib/pairs.json";
import type { ModelProfile } from "@/lib/match";

type Pair = (typeof pairsFile.pairs)[number];

function readyPairs() {
  const slugs = new Set(appList().map((app) => app.slug));
  return pairsFile.pairs.filter((pair) => slugs.has(pair.left) && slugs.has(pair.right));
}

function findPair(slug: string) {
  return readyPairs().find((pair) => pair.slug === slug) ?? null;
}

export function generateStaticParams() {
  const pairs = readyPairs();
  if (!pairs.length) return [{ pair: "_none" }];
  return pairs.map((pair) => ({ pair: pair.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair: slug } = await params;
  const pair = findPair(slug);
  if (!pair) return {};
  const left = appList().find((app) => app.slug === pair.left);
  const right = appList().find((app) => app.slug === pair.right);
  const title = `${left?.name ?? pair.left} vs ${right?.name ?? pair.right}: which AI app should you use?`;
  const description = `${pair.left_if} ${pair.right_if} Who wins each job today, with plans, free tiers, and privacy.`;
  return {
    title,
    description,
    alternates: { canonical: `/vs/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://whichai.today/vs/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function offer(app: AppRecord, pick: ModelProfile) {
  return app.models.some((model) => model.name === pick.name);
}

function winner(left: AppRecord, right: AppRecord, leader: ModelProfile, runner: ModelProfile, open: ModelProfile) {
  const slots = [
    { label: "Today's #1", pick: leader },
    { label: "Alternative", pick: runner },
    { label: "Open weights", pick: open },
  ];
  const leftSlot = slots.find((slot) => offer(left, slot.pick));
  const rightSlot = slots.find((slot) => offer(right, slot.pick));
  if (!leftSlot && !rightSlot) return "Neither app offers today's picks.";
  if (leftSlot && !rightSlot) return left.name;
  if (rightSlot && !leftSlot) return right.name;
  if (leftSlot!.pick.name === rightSlot!.pick.name) return "Tie";
  const leftAt = slots.indexOf(leftSlot!);
  const rightAt = slots.indexOf(rightSlot!);
  return leftAt <= rightAt ? left.name : right.name;
}

function AppFacts({ app, line }: { app: AppRecord; line: string }) {
  const free = app.plans.find((plan) => plan.price_usd_month === 0);
  return (
    <section className="rounded-2xl border border-zinc-800 p-4">
      <h2 className="text-lg font-semibold text-white">{app.name}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{line}</p>
      <ul className="mt-3 text-sm leading-6 text-zinc-400">
        {app.plans.map((plan) => (
          <li key={plan.name}>
            {plan.name}: {planPrice(plan.price_usd_month)}. {plan.free_tier}
          </li>
        ))}
        {!free ? <li>No free tier is stored.</li> : null}
        <li>Privacy default: {app.privacy.trains_by_default}</li>
      </ul>
    </section>
  );
}

export default async function VersusPage({ params }: { params: Promise<{ pair: string }> }) {
  const { pair: slug } = await params;
  const pair: Pair | null = findPair(slug);
  if (!pair) notFound();
  const left = appList().find((app) => app.slug === pair.left);
  const right = appList().find((app) => app.slug === pair.right);
  if (!left || !right) notFound();
  const path = `/vs/${slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
    { name: `${left.name} vs ${right.name}`, path },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(path, crumbs, [])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {left.name} vs {right.name}
        </h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          A win means the app offers the stronger stored pick for that job. It is not a sponsored ranking.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Job</th>
                <th className="py-2 font-semibold">Who wins today</th>
              </tr>
            </thead>
            <tbody>
              {categoryEntries().map(([key, category]) => (
                <tr key={key} className="border-t border-zinc-800">
                  <td className="py-3 pr-4">
                    <Link href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                      {category.display_name}
                    </Link>
                  </td>
                  <td className="py-3">
                    {winner(left, right, category.leader, category.runner_up, category.open_source_pick)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <AppFacts app={left} line={pair.left_if} />
          <AppFacts app={right} line={pair.right_if} />
        </div>
      </main>
    </div>
  );
}
