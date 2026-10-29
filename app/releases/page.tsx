import Link from "next/link";
import type { Metadata } from "next";
import { CopyFeedLink } from "@/components/CopyFeedLink";
import { RelativeDay } from "@/components/RelativeDay";
import { ReleaseTimeline } from "@/components/ReleaseTimeline";
import { releaseRows } from "@/lib/release-rows";
import { lastChecked } from "@/lib/releases";

const description = "New AI models and major AI features, newest first, each with a link to the company's own announcement.";
const FEED = "https://whichai.today/releases/feed.xml";

export const metadata: Metadata = {
  title: "Latest AI releases",
  description,
  alternates: {
    canonical: "/releases",
    types: { "application/rss+xml": FEED },
  },
  openGraph: {
    title: "Latest AI releases",
    description,
    url: "https://whichai.today/releases",
    siteName: "WhichAI.today",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Latest AI releases",
    description,
  },
};

export default function ReleasesPage() {
  const rows = releaseRows();
  const checked = lastChecked();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Latest AI releases</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          What AI companies just shipped: new models, new versions, open-weights drops, and major features in the apps
          people use. This is a timeline, not a ranking. Each entry links to the company&apos;s own announcement.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Checked every 6 hours
          </span>
          {checked ? (
            <span>
              Last checked <RelativeDay date={checked} lower />.
            </span>
          ) : null}
          <Link href="/methodology" className="text-zinc-300 hover:text-white">
            How we check
          </Link>
        </p>

        {rows.length ? (
          <ReleaseTimeline entries={rows} />
        ) : (
          <p className="mt-10 text-base leading-7 text-zinc-300">The first check has not run yet. Releases will appear here.</p>
        )}

        <section className="mt-14 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Follow new releases</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Add this feed to any RSS reader to get each release as it lands here.
          </p>
          <CopyFeedLink feed={FEED} />
        </section>
      </main>
    </div>
  );
}
