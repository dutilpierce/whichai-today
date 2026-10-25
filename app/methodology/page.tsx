import type { Metadata } from "next";
import models from "@/lib/models.json";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How WhichAI.today ranks AI models: the board for each job, the two-check rule, confidence labels, and the fact-check gate.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology",
    description: "How WhichAI.today chooses a leader, and what it does not claim.",
    url: "https://whichai.today/methodology",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function MethodologyPage() {
  const categories = Object.values(models.categories);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Methodology</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Each job is ranked on one public board. Other boards are support, not a second vote that can overturn the leader.
        </p>
        <h2 className="mt-12 text-2xl font-semibold text-white">The boards</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {categories.map((category) => (
            <li key={category.slug} className="text-sm leading-6 text-zinc-300">
              <a href={`/${category.slug}`} className="text-white hover:text-emerald-200">
                {category.display_name}
              </a>
              {": "}
              {category.primary_signal}. Also checked: {(category.sources ?? []).join(", ")}.
            </li>
          ))}
        </ul>
        <h2 className="mt-12 text-2xl font-semibold text-white">Two checks</h2>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          A daily job re-reads the boards. A new number one is noted the first day and replaces the leader only if the next run names it again. A one-day blip does not change the pick.
        </p>
        <h2 className="mt-12 text-2xl font-semibold text-white">How sure the label is</h2>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Close race means the runner-up&apos;s score is within 1% of the leader on the primary board. Otherwise, when more than one listed board was checked, the label is how many of them agree. When only one was checked, the label is Leads followed by that board&apos;s name.
        </p>
        <h2 className="mt-12 text-2xl font-semibold text-white">What gets published</h2>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          A fact-check runs before any ranking is published. A number in a reason has to appear in the stored evidence or the price. The runner-up cannot outscore the leader on the primary board. Privacy and price notes older than 45 days are held, and the card says it is being re-checked instead of showing the stale line. A change in how a category is ranked is logged on{" "}
          <a href="/changes" className="text-zinc-100 hover:text-white">Changes</a>
          {" "}as a methodology update and is not sent as an alert.
        </p>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Benchmarks measure a public task, not your files. Treat the top two picks as a shortlist and try both on a sample of your own work.
        </p>
      </main>
    </div>
  );
}
