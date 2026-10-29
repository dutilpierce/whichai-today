import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import models from "@/lib/models.json";
import site from "@/lib/site.json";

const reviewed = new Date(models.last_updated).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const coding = models.categories.coding;

const faqs = [
  {
    question: "Which AI is best for coding right now?",
    answer: `As of ${reviewed}, ${coding.leader.name} from ${coding.leader.provider} leads coding. ${coding.leader.why} The closest alternative is ${coding.runner_up.name} (${coding.runner_up.provider}), and the best open-weights option is ${coding.open_source_pick.name}.`,
  },
  {
    question: "Is ChatGPT or Claude better?",
    answer:
      "Neither wins every job. Claude models currently lead coding and long-document work, while other models lead general chat, speed, or price. WhichAI.today picks by task instead of crowning one brand.",
  },
  {
    question: "How often do the rankings change?",
    answer:
      "A scheduled job researches public leaderboards every day. A new number one has to come up on two checks in a row before it replaces the current leader, so a one-day blip does not flip the pick. Big launches usually reshuffle a category every few weeks, not every hour.",
  },
  {
    question: "Is WhichAI.today free?",
    answer:
      "Yes. There is no account and no paywall. You type a task or describe a project and get today's picks, with links to the model providers.",
  },
  {
    question: "What is an open-weights model?",
    answer:
      "An open-weights model publishes its weights so you can download and run it yourself, often on your own hardware. That matters when client data, source code, or contracts cannot leave your network. Every category on WhichAI.today includes one.",
  },
  {
    question: "Which AI should I use to summarize a long document?",
    answer: `Use the Legal & Long Documents pick. Right now that is ${models.categories.legal_analysis.leader.name}, chosen for reading dense sources such as contracts, filings, transcripts, and earnings calls without dropping details.`,
  },
  {
    question: "Can one project need more than one model?",
    answer:
      "Yes. A product launch might need a coding model for the app, a writing model for the launch copy, and a long-document model for the terms. Plan a project splits the work into stages and assigns today's pick to each stage.",
  },
  {
    question: "Where do the recommendations come from?",
    answer:
      "Public, independent evaluations: LMArena human-preference votes, the Artificial Analysis Intelligence Index, Vals AI LegalBench, SWE-bench, GPQA, and Humanity's Last Exam. The plain-English reasons cite the benchmark behind each pick.",
  },
];

export const metadata: Metadata = {
  title: "Why the right AI model matters",
  description:
    "Why the best AI model changes by task, how WhichAI.today picks today's leaders from public benchmarks, and how to choose a model for coding, writing, legal work, and whole projects.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const categories = Object.entries(models.categories);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              name: "Why the right AI model matters",
              url: "https://whichai.today/about",
              description: metadata.description,
              isPartOf: { "@type": "WebSite", url: "https://whichai.today" },
            },
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ],
        }}
      />
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        The model you already use is probably not the best one for this job.
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        WhichAI.today exists so anyone can match a task to the AI model that is
        actually leading that kind of work today, instead of defaulting to
        whichever chatbot they signed up for first.
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Our mission
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Most people treat &quot;AI&quot; as one product. It is not. Coding,
        contract review, creative writing, math, high-volume automation, and
        everyday questions are different jobs, and they are won by different
        models. The mission is to make that choice obvious in one screen: the
        current leader, why it leads, a strong alternative, and the best model
        you can run yourself.
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        AI leadership changes constantly
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Frontier models leapfrog each other every few weeks, and they do not
        leapfrog in the same category. A model that leads coding this month can
        trail on legal reading or speed. Last quarter&apos;s default is often
        this month&apos;s second or third choice. These are the leaders as of{" "}
        {reviewed}. The table updates when the rankings do.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Today&apos;s #1</th>
              <th className="px-4 py-3 font-medium">Alternative</th>
              <th className="px-4 py-3 font-medium">Open weights</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(([key, category]) => (
              <tr key={key} className="border-t border-zinc-800">
                <td className="px-4 py-3 text-zinc-200">
                  <Link href={`/${category.slug}`} className="hover:text-white">
                    {category.emoji} {category.display_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white">{category.leader.name}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {category.runner_up.name}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {category.open_source_pick.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Why choosing in real time matters
      </h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-zinc-300">
        <li>
          <span className="text-white">Quality. </span>
          The gap between the leader and the fifth-place model on a hard coding
          or legal benchmark is large enough to change whether the work is
          usable.
        </li>
        <li>
          <span className="text-white">Cost. </span>
          The same task can cost 10 to 100 times more on a flagship model than
          on a fast model that is good enough. Volume work should not run on
          the most expensive brain.
        </li>
        <li>
          <span className="text-white">Speed. </span>
          A support bot and a math proof do not want the same latency. The
          fastest model is rarely the smartest, and the smartest is rarely the
          fastest.
        </li>
        <li>
          <span className="text-white">Privacy. </span>
          Client files, source code, and contracts sometimes cannot leave your
          network. That is a different winner: the best open-weights model you
          can host yourself.
        </li>
        <li>
          <span className="text-white">Habit. </span>
          The expensive mistake is staying on last year&apos;s default because
          it is already open in a tab. The rankings exist so that habit has a
          cheap way to be checked.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        How WhichAI.today works
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Every ranked recommendation comes from a category in the table above. Each has its own page
        with the current picks and the leader history. Picks are
        grounded in public evaluations from LMArena, Artificial Analysis, Vals
        AI, SWE-bench, GPQA, and Humanity&apos;s Last Exam.
      </p>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        A daily job re-checks those sources. A new number one has to show up on
        two daily checks before it replaces the current leader. When you search, common phrases match a category
        instantly. Unusual wording goes to a fast classifier, and anything it
        cannot place lands in General, so a search always returns a
        recommendation. Plan a project does the same thing for a whole piece
        of work: it splits the description into stages and labels each stage
        with a category. The model names always come from the rankings, never
        from the planner&apos;s own opinion.
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        How to use it
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Quick pick is for one job. Try &quot;fix a bug in my React app,&quot;
        &quot;summarize this earnings call,&quot; or &quot;write a LinkedIn
        post.&quot; You get today&apos;s leader, an alternative, and an
        open-weights option, each with a reason and a direct link.
      </p>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Plan a project is for work with more than one kind of task. Describe
        what you are building, the main parts, the timeline, the team, and the
        scale. A solo blog relaunch, a three-month invoicing app, and a
        40-person contract-review rollout each come back as a different
        sequence of stages, with the right model for that stage.
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Who runs this
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        Run by {site.owner_name}.{" "}
        {site.contact_email ? (
          <a href={`mailto:${site.contact_email}`} className="text-white hover:text-emerald-200">
            {site.contact_email}
          </a>
        ) : (
          <a href={`${site.github_url}/issues`} className="text-white hover:text-emerald-200">
            Report an error on GitHub
          </a>
        )}
        .
      </p>
      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Independence
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        No paid placement, no affiliate links in the picks, and no provider sponsorship. A model is listed because of the public board for that job.
      </p>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        WhichAI.today is not affiliated with other sites using similar names.
      </p>
      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Corrections
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        {site.contact_email ? (
          <>
            Email{" "}
            <a href={`mailto:${site.contact_email}`} className="text-white hover:text-emerald-200">
              {site.contact_email}
            </a>{" "}
            to report an error.
          </>
        ) : (
          <>
            <a href={`${site.github_url}/issues`} className="text-white hover:text-emerald-200">
              Open a GitHub issue
            </a>{" "}
            to report an error.
          </>
        )}{" "}
        Corrections and changes to the ranking method are logged publicly on{" "}
        <Link href="/changes" className="text-white hover:text-emerald-200">
          Changes
        </Link>
        .
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Methodology and limits
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        The boards, the two-check rule, and the fact-check gate are on the{" "}
        <Link href="/methodology" className="text-white hover:text-emerald-200">
          methodology page
        </Link>
        . Benchmarks measure a public task, not your exact files. Rankings can lag a launch by a day, because the refresh runs once a day and only publishes answers that pass the checks.
      </p>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Questions people ask
      </h2>
      <div className="mt-6 flex flex-col gap-6">
        {faqs.map((faq) => (
          <section key={faq.question}>
            <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
            <p className="mt-2 text-base leading-7 text-zinc-300">{faq.answer}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
