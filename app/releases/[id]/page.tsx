import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { currentModels } from "@/lib/catalog";
import { pairsWith } from "@/lib/compare";
import { releaseIndexed } from "@/lib/release-rows";
import { formatDay, modelSlug } from "@/lib/picks";
import {
  KIND_LABEL,
  daysApart,
  monogram,
  providerHue,
  releaseById,
  releaseEntries,
  sourceHost,
  type Release,
} from "@/lib/releases";
import { faqNode, pageGraph, releaseArticle, type Faq } from "@/lib/schema";

export function generateStaticParams() {
  return releaseEntries().map((entry) => ({ id: entry.id }));
}

const AVAILABILITY = {
  available: "Available now",
  preview: "In preview",
  announced: "Announced, not yet available",
} as const;

const ROLE_PHRASE: Record<string, string> = {
  Leader: "#1 pick",
  Alternative: "alternative pick",
  "Open weights": "open-weights pick",
};

/** The model line without version numbers, so "Gemini Omni 1.2 Flash" and "Gemini Omni 1.1 Flash" match. */
function familyName(name: string) {
  return name
    .toLowerCase()
    .replace(/\d+(\.\d+)*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ReleaseList({ title, entries, withProvider = false }: { title: string; entries: Release[]; withProvider?: boolean }) {
  if (!entries.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="text-sm text-zinc-300">
            <Link href={`/releases/${entry.id}`} className="hover:text-white">
              {entry.name}
            </Link>{" "}
            <span className="text-zinc-500">
              {withProvider ? `${entry.provider}, ` : ""}
              {formatDay(entry.date)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function releaseFaqs(release: Release, ranked: ReturnType<typeof currentModels>[number] | null): Faq[] {
  const when = formatDay(release.date);
  const faqs: Faq[] = [
    {
      question: `When was ${release.name} released?`,
      answer: `${release.provider} released ${release.name} on ${when}.`,
    },
    {
      question: `Is ${release.name} available now?`,
      answer:
        release.status === "available"
          ? `Yes. ${release.name} has been available since ${when}.`
          : release.status === "preview"
            ? `It is in preview. ${release.provider} opened ${release.name} to some users on ${when}.`
            : `Not yet. ${release.provider} announced ${release.name} on ${when}, before it shipped.`,
    },
    {
      question: `What's new in ${release.name}?`,
      answer: release.summary,
    },
  ];
  if (release.kind !== "feature") {
    faqs.push({
      question: `Where does ${release.name} rank?`,
      answer: ranked?.roles.length
        ? `${release.name} is today's ${ranked.roles
            .map((role) => `${ROLE_PHRASE[role.role] ?? role.role} for ${role.display_name.toLowerCase()}`)
            .join(", ")}, based on public leaderboards checked daily.`
        : `${release.name} is not one of today's top three picks in any job this site ranks. The rankings are checked daily.`,
    });
  }
  return faqs;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const release = releaseById(id);
  if (!release) return {};
  const title = `${release.name} release date, features & availability`;
  const what = release.features.length ? `What's new: ${release.features.join(", ")}.` : release.summary;
  const description = `Released ${formatDay(release.date)} by ${release.provider}, ${AVAILABILITY[release.status].toLowerCase()}. ${what}`;
  const url = `https://whichai.today/releases/${id}`;
  return {
    title,
    description,
    alternates: { canonical: `/releases/${id}` },
    robots: releaseIndexed(release) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "article", publishedTime: release.date },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = releaseById(id);
  if (!release) notFound();

  const entries = releaseEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  const newer = entries[index - 1] ?? null;
  const older = entries[index + 1] ?? null;
  const family = familyName(release.name);
  const earlier = entries.filter(
    (entry) =>
      entry.provider === release.provider &&
      entry.id !== id &&
      entry.date <= release.date &&
      familyName(entry.name) === family,
  );
  const sameProvider = entries
    .filter((entry) => entry.provider === release.provider && entry.id !== id && !earlier.includes(entry))
    .slice(0, 5);
  const sameWeek = entries
    .filter((entry) => entry.id !== id && entry.provider !== release.provider && Math.abs(daysApart(entry.date, release.date)) <= 3)
    .slice(0, 6);
  const slug = modelSlug(release.name);
  const ranked = currentModels().find((model) => model.slug === slug) ?? null;
  const matchups = ranked ? pairsWith(ranked.slug, undefined, 4) : [];
  const faqs = releaseFaqs(release, ranked);
  const hue = providerHue(release.provider);
  const path = `/releases/${id}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Releases", path: "/releases" },
    { name: release.name, path },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(path, crumbs, [releaseArticle(release, path), faqNode(faqs)])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: `hsl(${hue} 55% 45% / 0.18)`, color: `hsl(${hue} 85% 78%)` }}
          >
            {monogram(release.provider)}
          </span>
          <p className="text-sm text-zinc-400">{release.provider}</p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {release.name}: release date and what&apos;s new
        </h1>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Released</dt>
            <dd className="mt-1 text-base font-semibold text-white">
              <time dateTime={release.date}>{formatDay(release.date)}</time>
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Status</dt>
            <dd className="mt-1 text-base font-semibold text-white">{AVAILABILITY[release.status]}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Type</dt>
            <dd className="mt-1 text-base font-semibold text-white">{KIND_LABEL[release.kind]}</dd>
          </div>
        </dl>

        <p className="mt-8 text-base leading-7 text-zinc-200">{release.summary}</p>

        {release.features.length ? (
          <>
            <h2 className="mt-10 text-xl font-semibold text-white">What&apos;s new</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {release.features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200"
                >
                  {feature}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="mt-8 text-sm text-zinc-400">
          Official announcement:{" "}
          <a href={release.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
            {sourceHost(release.source_url)} ↗
          </a>
        </p>

        {ranked ? (
          <section className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h2 className="text-lg font-semibold text-white">Where {release.name} ranks today</h2>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-zinc-300">
              {ranked.roles.map((role) => (
                <li key={`${role.slug}-${role.role}`}>
                  <Link href={`/${role.slug}`} className="hover:text-white">
                    {role.emoji} {role.display_name}: {role.role}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <Link href={`/models/${ranked.slug}`} className="text-emerald-300 hover:text-emerald-200">
                Full {release.name} profile →
              </Link>
            </p>
            {matchups.length ? (
              <>
                <h3 className="mt-5 text-sm font-semibold text-white">Compare it</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {matchups.map(({ record, other }) => (
                    <li key={record.pair}>
                      <Link
                        href={`/compare/${record.pair}`}
                        className="inline-block rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:text-white"
                      >
                        vs {other.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        <ReleaseList title="Earlier versions" entries={earlier} />
        <ReleaseList title={`More from ${release.provider}`} entries={sameProvider} />
        <ReleaseList title="Released the same week" entries={sameWeek} withProvider />

        <FaqList faqs={faqs} />

        <nav className="mt-12 grid gap-3 border-t border-zinc-800 pt-6 sm:grid-cols-2" aria-label="More releases">
          {older ? (
            <Link href={`/releases/${older.id}`} className="text-sm text-zinc-400 hover:text-white">
              ← Earlier: {older.name}
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/releases/${newer.id}`} className="text-sm text-zinc-400 hover:text-white sm:text-right">
              Newer: {newer.name} →
            </Link>
          ) : null}
        </nav>
        <p className="mt-6 text-sm">
          <Link href="/releases" className="text-emerald-300 hover:text-emerald-200">
            All recent AI releases →
          </Link>
        </p>
      </main>
    </div>
  );
}
