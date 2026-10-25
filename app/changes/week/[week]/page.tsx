import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { weekById, weekRecords } from "@/lib/catalog";
import { formatDay } from "@/lib/picks";

export function generateStaticParams() {
  const weeks = weekRecords();
  if (!weeks.length) return [{ week: "_none" }];
  return weeks.map((week) => ({ week: week.week }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  const found = weekById(week);
  if (!found) return {};
  const title = `Leader changes, ${week}`;
  const description = found.changes
    .map((change) => `${change.category.display_name}: ${change.leader} overtook ${change.previous}`)
    .join(" ");
  const url = `https://whichai.today/changes/week/${week}`;
  return {
    title,
    description,
    alternates: { canonical: `/changes/week/${week}` },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const found = weekById(week);
  if (!found) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <a href="/changes" className="text-sm text-zinc-400 hover:text-white">
          All changes
        </a>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Leader changes, {found.week}
        </h1>
        <ul className="mt-8 flex flex-col gap-6">
          {found.changes.map((change) => (
            <li key={change.id}>
              <a href={`/changes/${change.id}`} className="text-lg font-semibold text-white hover:text-emerald-200">
                {formatDay(change.date)}. {change.category.display_name}: {change.leader} overtook {change.previous}
              </a>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{change.evidence}</p>
              <a href={`/${change.slug}`} className="mt-2 inline-flex text-sm text-zinc-400 hover:text-white">
                {change.category.display_name}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
