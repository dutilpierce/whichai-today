import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
import { TaskPicks, taskPick } from "@/components/TaskPicks";
import pickerFile from "@/lib/picker.json";

export function generateStaticParams() {
  return pickerFile.topics.map((topic) => ({ topic: topic.slug }));
}

function findTopic(slug: string) {
  return pickerFile.topics.find((topic) => topic.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = findTopic(slug);
  if (!topic) return {};
  const title = `${topic.name}: the best AI for each task`;
  const picks = topic.goals
    .map((goal) => {
      const row = taskPick(goal.task);
      return row?.pick ? `${goal.label.toLowerCase()}, ${row.pick}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const description = `Today's picks: ${picks}. Each one comes with a ready prompt.`;
  return {
    title,
    description,
    alternates: { canonical: `/pick/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://whichai.today/pick/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = findTopic(slug);
  if (!topic) notFound();
  const path = `/pick/${slug}`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <Link href="/pick" className="text-sm text-zinc-400 hover:text-white">
          Back
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{topic.name}</h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          The best AI is different for each of these. Here is today&apos;s pick for every task, with a tip on what to
          give it. Each one opens a page with a prompt ready to copy.
        </p>
        <TaskPicks slugs={topic.goals.map((goal) => goal.task)} />
      </main>
    </div>
  );
}
