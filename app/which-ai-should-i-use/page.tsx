import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { appList } from "@/lib/apps";
import { coverage, planName, priceLabel, shortAnswer, useItIn, type CoverageRow, type Job, type Mark } from "@/lib/hub";
import { freeAndPaid } from "@/lib/options";
import { categoryEntries, leaderBadge, shortLabel } from "@/lib/picks";
import { faqNode, pageGraph } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Which AI should I use",
  description:
    "A straight answer: the best AI for each job today, where to use it and what it costs, what one subscription covers, and the best free and private options.",
  alternates: { canonical: "/which-ai-should-i-use" },
  openGraph: {
    title: "Which AI should I use",
    description: "Today's #1 model for each job, where to use it, and what one subscription gets you.",
    url: "https://whichai.today/which-ai-should-i-use",
    siteName: "WhichAI.today",
    type: "website",
  },
};

const PATH = "/which-ai-should-i-use";
const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Which AI should I use", path: PATH },
];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em]";
// On phones the matrix scrolls sideways, so the app column stays put.
const pinned = "max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-zinc-900";
const card = "flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-600";

const STILL = [
  { href: "/pick", title: "Answer two questions", text: "Pick a topic and a goal, then get a task page with a prompt ready to copy." },
  { href: "/", title: "Describe your task", text: "Type what you need. Quick pick matches it to a job and can remember the apps you pay for." },
  { href: "/compare", title: "Compare two models", text: "Scores side by side, job by job, with what each costs and whether it trains on your chats." },
  { href: "/faq", title: "Common questions", text: "Free or paid, model or app, privacy, and how often a leader changes." },
];

function JobChip({ job }: { job: Job }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-0.5 text-[0.7rem] font-medium text-zinc-300">
      <span aria-hidden>{job.emoji}</span>
      {shortLabel(job.slug)}
    </span>
  );
}

function PathCard({
  href,
  label,
  title,
  cta,
  featured = false,
  children,
}: {
  href: string;
  label: string;
  title: string;
  cta: string;
  featured?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        featured
          ? "group flex h-full flex-col rounded-2xl border-2 border-emerald-500 bg-linear-to-b from-emerald-500/15 to-zinc-900 p-5 shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition hover:border-emerald-400"
          : `group ${card}`
      }
    >
      <p className={`${eyebrow} ${featured ? "text-emerald-300" : "text-zinc-400"}`}>{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</p>
      <div className="mt-2 flex-1 text-sm leading-6 text-zinc-300">{children}</div>
      <span className="mt-4 text-sm font-medium text-emerald-300 group-hover:text-emerald-200">{cta} →</span>
    </Link>
  );
}

function JobCard({ job }: { job: Job }) {
  const { offer, text } = useItIn(job);
  const free = freeAndPaid(job).free;
  const badge = leaderBadge(
    job.leader.sources_agreeing,
    job.leader.sources_checked,
    job.primary_signal,
    job.leader.primary_score,
    job.runner_up.primary_score,
  );
  return (
    <Link href={`/${job.slug}`} className={`group ${card} sm:[&:last-child:nth-child(odd)]:col-span-2`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl">
          {job.emoji}
        </span>
        <p className="text-sm font-medium text-zinc-200">{job.display_name}</p>
      </div>
      <p className={`${eyebrow} mt-5 text-emerald-400`}>Today&apos;s #1</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-white">{job.leader.name}</p>
      <p className="mt-2 self-start rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">{badge}</p>
      <dl className="mt-4 flex-1 space-y-3 border-t border-zinc-800 pt-4">
        <div>
          <dt className={`${eyebrow} text-[0.65rem] text-zinc-500`}>Use it in</dt>
          <dd className="mt-0.5 text-sm text-zinc-200">
            {offer ? (
              offer.price === 0 ? (
                `Free in ${offer.app.name}`
              ) : (
                <>
                  {planName(offer.app, offer.plan)}{" "}
                  <span className="text-zinc-400">· {priceLabel(offer.price)}</span>
                </>
              )
            ) : (
              <span className="text-zinc-300">{text}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className={`${eyebrow} text-[0.65rem] text-zinc-500`}>Free pick</dt>
          <dd className="mt-0.5 text-sm text-zinc-300">
            {!free ? "None stored yet." : free.name === job.leader.name ? "The #1 is free to start." : free.name}
          </dd>
        </div>
      </dl>
      <span className="mt-4 text-xs font-medium text-zinc-400 group-hover:text-emerald-300">Full ranking →</span>
    </Link>
  );
}

function MarkCell({ mark }: { mark: Mark }) {
  if (mark === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.45)]">
        <span aria-hidden>1</span>
        <span className="sr-only">Has today&apos;s #1</span>
      </span>
    );
  }
  if (mark === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/60 text-xs font-semibold text-emerald-300">
        <span aria-hidden>2</span>
        <span className="sr-only">Has the runner-up</span>
      </span>
    );
  }
  return (
    <span className="text-zinc-600">
      <span aria-hidden>·</span>
      <span className="sr-only">Neither</span>
    </span>
  );
}

function CoverageRows({ title, rows, width }: { title: string; rows: CoverageRow[]; width: number }) {
  if (!rows.length) return null;
  return (
    <>
      <tr>
        <th colSpan={width} scope="colgroup" className={`${eyebrow} bg-zinc-950/40 px-4 pb-2 pt-4 text-left text-zinc-500`}>
          <span className="sticky left-4">{title}</span>
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.app.slug} className="border-t border-zinc-800/70">
          <th scope="row" className={`${pinned} px-4 py-3 text-left font-normal`}>
            <Link href={`/apps/${row.app.slug}`} className="font-medium text-white hover:text-emerald-200">
              {row.app.name}
            </Link>
            <p className="text-xs text-zinc-400">
              {row.plan.name} · {priceLabel(row.plan.price_usd_month ?? 0)}
            </p>
            {row.upgrade ? (
              <p className="mt-0.5 text-[0.7rem] text-zinc-500">
                {row.upgrade.plan.name} ({priceLabel(row.upgrade.plan.price_usd_month ?? 0)}): #1 in {row.upgrade.firsts}
              </p>
            ) : null}
          </th>
          {row.marks.map((mark, index) => (
            <td key={index} className="px-1 py-3 text-center">
              <MarkCell mark={mark} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function HubPage() {
  const jobs = categoryEntries().map(([, job]) => job);
  const answer = shortAnswer();
  const matrix = coverage();
  const ollama = appList().find((app) => app.slug === "ollama");
  const width = matrix.jobs.length + 1;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={pageGraph(PATH, CRUMBS, [
          faqNode([{ question: "Which AI should I use?", answer: answer.verdict }]),
          {
            "@type": "ItemList",
            name: "Jobs ranked on WhichAI.today",
            numberOfItems: jobs.length,
            itemListElement: jobs.map((job, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: job.display_name,
              item: `https://whichai.today/${job.slug}`,
            })),
          },
        ])}
      />
      <main>
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Which AI should I use?</h1>
        <Freshness path={PATH} />
        <p className="mt-5 text-lg leading-8 text-zinc-100 sm:text-xl">{answer.verdict}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          No single AI is best at everything. Start from the job, then pick the cheapest place to use the model that
          leads it. Every answer here is worked out from today&apos;s rankings and stored plan prices.
        </p>

        <section aria-labelledby="short-answer" className="mt-10">
          <h2 id="short-answer" className="text-xl font-semibold text-white">The short answer</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {answer.best ? (
              <PathCard
                featured
                href={`/apps/${answer.best.app.slug}`}
                label="One subscription"
                title={planName(answer.best.app, answer.best.plan)}
                cta={`What ${answer.best.app.name} includes`}
              >
                <p>
                  <span className="text-lg font-semibold text-white">{priceLabel(answer.best.plan.price_usd_month ?? 0)}</span>{" "}
                  for today&apos;s #1 model in:
                </p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {answer.best.leads.map((job) => (
                    <JobChip key={job.slug} job={job} />
                  ))}
                </p>
              </PathCard>
            ) : null}
            <PathCard
              href="/free"
              label="Pay nothing"
              title={answer.free.everyday?.name ?? "Free picks"}
              cta="Free picks for every job"
            >
              {answer.free.everyday ? (
                <p>
                  The best free pick for everyday questions and drafts
                  {answer.free.everydayApp ? `, in ${answer.free.everydayApp.name}` : ""}. Other jobs have their own free
                  pick, each with a usage limit.
                </p>
              ) : (
                <p>Free tiers and open-weights models, with the limit for each job.</p>
              )}
            </PathCard>
            {answer.coding?.offer ? (
              <PathCard
                href={`/apps/${answer.coding.offer.app.slug}`}
                label="You write code"
                title={planName(answer.coding.offer.app, answer.coding.offer.plan)}
                cta={`See ${answer.coding.offer.app.name}`}
              >
                <p>
                  The cheapest plan with {answer.coding.job.leader.name}, today&apos;s #1 for coding, at{" "}
                  <span className="font-semibold text-white">{priceLabel(answer.coding.offer.price)}</span>.
                </p>
                {answer.coding.also.length ? (
                  <>
                    <p className={`${eyebrow} mt-4 text-[0.65rem] text-zinc-500`}>Also in</p>
                    <ul className="mt-1 space-y-0.5">
                      {answer.coding.also.map((offer) => (
                        <li key={offer.app.slug} className="text-zinc-200">
                          {planName(offer.app, offer.plan)}{" "}
                          <span className="text-zinc-400">· {priceLabel(offer.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </PathCard>
            ) : null}
            <PathCard
              href={ollama ? `/apps/${ollama.slug}` : "/free"}
              label="Keep files private"
              title="Open-weights models"
              cta={ollama ? `Run them with ${ollama.name}` : "See the free picks"}
            >
              <p>Weights you can download and run on hardware you control, so files never leave it.</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {answer.open.map((pick) => (
                  <li
                    key={pick.name}
                    title={pick.jobs.map((job) => job.display_name).join(", ")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-2.5 py-0.5 text-[0.7rem] font-medium text-zinc-200"
                  >
                    {pick.name}
                    <span aria-hidden>{pick.jobs.map((job) => job.emoji).join("")}</span>
                  </li>
                ))}
              </ul>
            </PathCard>
          </div>
        </section>

        <section aria-labelledby="by-job" className="mt-14">
          <h2 id="by-job" className="text-xl font-semibold text-white">Pick by job</h2>
          <p className="mt-2 text-sm text-zinc-400">Today&apos;s #1 for each job, and the cheapest place to use it.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        </section>

        {matrix.rows.length ? (
          <section aria-labelledby="coverage" className="mt-14">
            <h2 id="coverage" className="text-xl font-semibold text-white">What one subscription covers</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Each app at its plan of $20/month or less with the most #1 models. A pricier plan that adds more is noted
              under the price.
            </p>
            <div aria-hidden className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-2"><MarkCell mark={1} /> Today&apos;s #1</span>
              <span className="flex items-center gap-2"><MarkCell mark={2} /> Runner-up</span>
            </div>
            <div className="relative mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <table className="w-full min-w-[24rem] text-sm sm:min-w-[32rem] text-zinc-300">
                <thead className="bg-zinc-900">
                  <tr>
                    <th scope="col" className={`${eyebrow} ${pinned} px-4 py-3 text-left text-zinc-500`}>App and plan</th>
                    {matrix.jobs.map((job) => (
                      <th key={job.slug} scope="col" title={job.display_name} className="px-1 py-3 text-center font-normal">
                        <span aria-hidden className="block text-base">{job.emoji}</span>
                        <span aria-hidden className="mt-0.5 block text-[0.6rem] text-zinc-500">{shortLabel(job.slug)}</span>
                        <span className="sr-only">{job.display_name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CoverageRows title="Chat apps" rows={matrix.rows.filter((row) => row.chat)} width={width} />
                  <CoverageRows title="Coding tools" rows={matrix.rows.filter((row) => !row.chat)} width={width} />
                </tbody>
              </table>
            </div>
            {matrix.missing.length ? (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {matrix.missing.map((job) => job.display_name).join(", ")}: no tracked app plan lists these leaders yet.
                Their cards above say where to get them.
              </p>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="still" className="mt-14">
          <h2 id="still" className="text-xl font-semibold text-white">Still not sure?</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {STILL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={`group ${card}`}>
                  <span className="font-medium text-white group-hover:text-emerald-200">{item.title} →</span>
                  <span className="mt-1 text-sm leading-6 text-zinc-400">{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
