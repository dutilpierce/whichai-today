import Link from "next/link";
import type { Metadata } from "next";
import { Freshness } from "@/components/Freshness";
import { freeAndPaid } from "@/lib/options";
import { categoryEntries, formatDay } from "@/lib/picks";
import models from "@/lib/models.json";

export const metadata: Metadata = {
  title: "Best free AI",
  description:
    "The best free option and the best paid option for each job WhichAI.today ranks, from the stored picks and app plans.",
  alternates: { canonical: "/free" },
  openGraph: {
    title: "Best free AI",
    description: "Free and paid options for each ranked job, with the free-tier limit and the date.",
    url: "https://whichai.today/free",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function FreePage() {
  const reviewed = formatDay(models.last_updated);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Best free AI</h1>
        <Freshness path="/free" />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Each row is one ranked job. The free column is the best pick you can use without paying, plus the
          free-tier limit. The paid column is the best paid pick. Last reviewed {reviewed}.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Job</th>
                <th className="py-2 pr-4 font-semibold">Best free</th>
                <th className="py-2 font-semibold">Best paid</th>
              </tr>
            </thead>
            <tbody>
              {categoryEntries().map(([key, category]) => {
                const row = freeAndPaid(category);
                return (
                  <tr key={key} className="border-t border-zinc-800 align-top">
                    <td className="py-3 pr-4">
                      <Link href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                        {category.emoji} {category.display_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {row.free ? (
                        <>
                          <p>
                            {row.freeApp ? `${row.freeApp.name} → ` : ""}
                            {row.free.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">{row.freeLimit}</p>
                        </>
                      ) : (
                        "No free option stored."
                      )}
                    </td>
                    <td className="py-3">
                      <p>
                        {row.paidApp ? `${row.paidApp.name} → ` : ""}
                        {row.paid.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{row.paidPlan}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
