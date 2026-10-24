import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { changeById, confirmedChanges } from "@/lib/catalog";
import { formatDay } from "@/lib/picks";

export function generateStaticParams() {
  return confirmedChanges().map((change) => ({ id: change.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const change = changeById(id);
  if (!change) return {};
  const title = `${change.category.display_name}: ${change.leader} overtook ${change.previous}`;
  const description = change.evidence;
  const url = `https://whichai.today/changes/${id}`;
  return {
    title,
    description,
    alternates: { canonical: `/changes/${id}` },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ChangePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const change = changeById(id);
  if (!change) notFound();
  const leader = change.category.leader;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header>
        <a href="/changes" className="text-sm text-zinc-400 hover:text-white">
          All changes
        </a>
      </header>
      <main className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {change.category.display_name}: {change.leader} overtook {change.previous}
        </h1>
        <p className="mt-4 text-sm text-zinc-400">{formatDay(change.date)}</p>
        <p className="mt-4 text-base leading-7 text-zinc-300">{change.evidence}</p>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          The previous leader was {change.previous}. {leader.where_to_get}
        </p>
        <p className="mt-6">
          <a href={`/${change.slug}`} className="text-sm font-medium text-emerald-300 hover:text-emerald-200">
            {change.category.emoji} {change.category.display_name}
          </a>
        </p>
      </main>
    </div>
  );
}
