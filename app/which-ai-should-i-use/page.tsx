import Link from "next/link";
import type { Metadata } from "next";
import { Freshness } from "@/components/Freshness";
import { appList, appsOffering } from "@/lib/apps";
import { freeAndPaid } from "@/lib/options";
import { categoryEntries, formatDay } from "@/lib/picks";
import { STACKS, stackTotal } from "@/lib/stacks";
import models from "@/lib/models.json";

export const metadata: Metadata = {
  title: "Which AI should I use",
  description:
    "Today's best model for each job, the best free option, and the best app, plus four ways to pay for it.",
  alternates: { canonical: "/which-ai-should-i-use" },
  openGraph: {
    title: "Which AI should I use",
    description: "A short answer for each job, from the stored rankings.",
    url: "https://whichai.today/which-ai-should-i-use",
    siteName: "WhichAI.today",
    type: "website",
  },
};

const POINTS = [
  "Start from the job, not from the app you already pay for.",
  "Use the free option when its limit covers the work.",
  "Pay for the leader when that job is the one you do every day.",
  "Keep private files on a model you can run yourself.",
  "Read the date. A leader can move after the next check.",
];

export default function HubPage() {
  const reviewed = formatDay(models.last_updated);
  const apps = appList();
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Which AI should I use?</h1>
        <Freshness path="/which-ai-should-i-use" />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Each row is one job this site ranks. The model is today&apos;s stored leader. The app is one that offers
          that model, when the app table has it. Last reviewed {reviewed}.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Job</th>
                <th className="py-2 pr-4 font-semibold">Today&apos;s #1</th>
                <th className="py-2 pr-4 font-semibold">Best free</th>
                <th className="py-2 font-semibold">Best app</th>
              </tr>
            </thead>
            <tbody>
              {categoryEntries().map(([key, category]) => {
                const row = freeAndPaid(category);
                const app = appsOffering(category.leader.name)[0];
                return (
                  <tr key={key} className="border-t border-zinc-800 align-top">
                    <td className="py-3 pr-4">
                      <Link href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                        {category.emoji} {category.display_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-white">{category.leader.name}</td>
                    <td className="py-3 pr-4">{row.free ? row.free.name : "No free option stored."}</td>
                    <td className="py-3">{app ? app.name : "Not stored yet."}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-white">What it costs</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Totals use prices stored on the app pages. A missing price is left blank instead of guessed.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {STACKS.map((stack) => {
            const total = stackTotal(stack.slugs, apps, "preferFree" in stack && stack.preferFree);
            return (
              <li key={stack.id} className="rounded-2xl border border-zinc-800 px-4 py-3">
                <p className="text-white">{stack.name}</p>
                <p className="mt-1 text-sm text-zinc-300">{total.label}</p>
                <p className="mt-1 text-sm text-zinc-500">{stack.note}</p>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-12 text-xl font-semibold text-white">How to choose</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7 text-zinc-300">
          {POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <p className="mt-8 text-sm">
          <Link href="/free" className="text-emerald-300 hover:text-emerald-200">Best free AI</Link>
          <Link href="/pick" className="ml-4 text-zinc-400 hover:text-white">Not sure what to type?</Link>
          <Link href="/tasks" className="ml-4 text-zinc-400 hover:text-white">Tasks</Link>
          <Link href="/faq" className="ml-4 text-zinc-400 hover:text-white">FAQ</Link>
        </p>
      </main>
    </div>
  );
}
