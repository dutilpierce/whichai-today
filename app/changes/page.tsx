import type { Metadata } from "next";
import { confirmedChanges, trackingStart, weekRecords } from "@/lib/catalog";
import { formatDay } from "@/lib/picks";

export const metadata: Metadata = {
  title: "Leader changes",
  description: "Confirmed changes to the number-one AI model in each job on WhichAI.today.",
  alternates: { canonical: "/changes" },
  openGraph: {
    title: "Leader changes",
    description: "Confirmed changes to the number-one AI model in each job on WhichAI.today.",
    url: "https://whichai.today/changes",
    siteName: "WhichAI.today",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leader changes",
    description: "Confirmed changes to the number-one AI model in each job on WhichAI.today.",
  },
};

export default function ChangesPage() {
  const changes = confirmedChanges();
  const weeks = weekRecords();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Leader changes</h1>
        {changes.length ? (
          <ul className="mt-8 flex flex-col gap-4">
            {changes.map((change) => (
              <li key={change.id}>
                <a href={`/changes/${change.id}`} className="text-base text-zinc-100 hover:text-white">
                  {formatDay(change.date)}. {change.category.display_name}: {change.leader} overtook {change.previous}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-base leading-7 text-zinc-300">
            No leader changes yet. Tracking began {formatDay(trackingStart())}.
          </p>
        )}
        {weeks.length ? (
          <>
            <h2 className="mt-12 text-2xl font-semibold text-white">Weeks</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {weeks.map((week) => (
                <li key={week.week}>
                  <a href={`/changes/week/${week.week}`} className="text-sm text-zinc-300 hover:text-white">
                    Week of {week.week}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </main>
    </div>
  );
}
