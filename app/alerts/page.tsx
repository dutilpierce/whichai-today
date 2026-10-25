import type { Metadata } from "next";
import { CopyFeedLink } from "@/components/CopyFeedLink";
import { EmailSignup } from "@/components/EmailSignup";
import site from "@/lib/site.json";

export const metadata: Metadata = {
  title: "Get alerts",
  description:
    "Follow WhichAI.today leader changes by email, Telegram, Bluesky, or a feed reader.",
  alternates: { canonical: "/alerts" },
  openGraph: {
    title: "Get alerts",
    description: "Follow WhichAI.today leader changes by email, Telegram, or Bluesky.",
    url: "https://whichai.today/alerts",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function AlertsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Get alerts
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          A new number one has to show up on two daily checks before it replaces the
          current leader. These are the ways to hear about that change.
        </p>
        <div className="mt-8">
          <EmailSignup />
        </div>
        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Telegram and Bluesky</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Confirmed leader changes are posted to both. Follow either one and your phone
            notifies you the usual way.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {site.telegram_url ? (
              <a href={site.telegram_url} className="text-emerald-300 hover:text-emerald-200">
                Follow on Telegram
              </a>
            ) : (
              <p className="text-zinc-400">Telegram: coming soon.</p>
            )}
            {site.bluesky_url ? (
              <a href={site.bluesky_url} className="text-emerald-300 hover:text-emerald-200">
                Follow on Bluesky
              </a>
            ) : (
              <p className="text-zinc-400">Bluesky: coming soon.</p>
            )}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Use a feed reader?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Copy this feed link. It is the same list the email and social posts are built from.
          </p>
          <CopyFeedLink />
        </section>
      </main>
    </div>
  );
}
