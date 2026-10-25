import type { Metadata } from "next";
import { Freshness } from "@/components/Freshness";
import pickerFile from "@/lib/picker.json";

export const metadata: Metadata = {
  title: "Not sure what to type",
  description: "Pick a topic, then a goal. Each goal opens a task page with today's picks.",
  alternates: { canonical: "/pick" },
  openGraph: {
    title: "Not sure what to type",
    description: "A short path from a topic to a task.",
    url: "https://whichai.today/pick",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function PickPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Not sure what to type?</h1>
        <Freshness path="/pick" />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Choose a topic. The next page is a few goals, and each goal is a task this site already answers.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {pickerFile.topics.map((topic) => (
            <li key={topic.slug}>
              <a
                href={`/pick/${topic.slug}`}
                className="block rounded-2xl border border-zinc-800 px-4 py-3 text-zinc-100 hover:border-zinc-600"
              >
                {topic.name}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
