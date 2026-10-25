import type { Metadata } from "next";
import { CiteThis } from "@/components/CiteThis";
import { JsonLd } from "@/components/JsonLd";
import { DATA_ATTRIBUTION, DATA_LICENSE, DATA_LICENSE_URL } from "@/lib/open-data";
import { pageDates } from "@/lib/freshness";
import { formatDay } from "@/lib/picks";

export const metadata: Metadata = {
  title: "Open data",
  description:
    "Download WhichAI.today's current picks and leader history as JSON or CSV. Free to reuse with attribution.",
  alternates: { canonical: "/data" },
  openGraph: {
    title: "Open data",
    description: "Current picks and leader history, free to reuse with attribution.",
    url: "https://whichai.today/data",
    siteName: "WhichAI.today",
    type: "website",
  },
};

const fields = [
  ["category", "The job, such as coding or writing."],
  ["slot", "leader, runner_up, or open_source_pick."],
  ["name", "The model name."],
  ["provider", "The company behind the model."],
  ["primary_signal", "The board this category is ranked on."],
  ["primary_score", "The score on that board, or empty when the pick has no score there."],
  ["sources_agreeing", "How many listed boards agree with the pick."],
  ["sources_checked", "How many listed boards were checked."],
  ["benchmark_context", "The stored evidence sentence."],
  ["cost", "The stored plan or API price."],
  ["source_url", "The leaderboard page behind the pick."],
  ["updated", "The date this category's content last changed."],
  ["date", "The date of a history entry."],
  ["previous", "The earlier leader, empty when tracking began."],
  ["type", "change for a real leader switch, methodology for a ranking-method note."],
  ["evidence", "Why the entry was logged."],
];

export default function DataPage() {
  const checked = formatDay(pageDates("/").checked);
  const citation = `Source: ${DATA_ATTRIBUTION}, rankings as of ${checked}, whichai.today/data`;
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "WhichAI.today rankings",
          description: metadata.description,
          url: "https://whichai.today/data",
          license: DATA_LICENSE_URL,
          creator: { "@type": "Organization", name: DATA_ATTRIBUTION, url: "https://whichai.today" },
          distribution: [
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://whichai.today/data/picks.json" },
            { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: "https://whichai.today/data/picks.csv" },
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://whichai.today/data/history.json" },
            { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: "https://whichai.today/data/history.csv" },
          ],
        }}
      />
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Open data</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          These files are the same rankings the site shows. They update when the daily check changes a page. The license is {DATA_LICENSE}: free to reuse if you credit {DATA_ATTRIBUTION}.
        </p>
        <ul className="mt-6 flex flex-col gap-2 text-base text-zinc-200">
          <li><a className="text-emerald-300 hover:text-emerald-200" href="/data/picks.json">Current picks (JSON)</a></li>
          <li><a className="text-emerald-300 hover:text-emerald-200" href="/data/picks.csv">Current picks (CSV)</a></li>
          <li><a className="text-emerald-300 hover:text-emerald-200" href="/data/history.json">Leader history (JSON)</a></li>
          <li><a className="text-emerald-300 hover:text-emerald-200" href="/data/history.csv">Leader history (CSV)</a></li>
        </ul>
        <p className="mt-6 text-sm leading-6 text-zinc-400">
          <a href={DATA_LICENSE_URL} className="text-zinc-200 hover:text-white">{DATA_LICENSE}</a>
          . JSON files include the license, attribution, source, and the time they were generated. CSV files start with the same note.
        </p>
        <h2 className="mt-12 text-2xl font-semibold text-white">Fields</h2>
        <dl className="mt-4 flex flex-col gap-4">
          {fields.map(([name, meaning]) => (
            <div key={name}>
              <dt className="text-sm font-medium text-white">{name}</dt>
              <dd className="text-sm leading-6 text-zinc-400">{meaning}</dd>
            </div>
          ))}
        </dl>
        <CiteThis text={citation} />
      </main>
    </div>
  );
}
