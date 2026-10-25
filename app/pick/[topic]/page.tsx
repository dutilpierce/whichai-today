import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
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
  return {
    title: topic.name,
    description: `Goals for ${topic.name}. Each one opens a task page.`,
    alternates: { canonical: `/pick/${slug}` },
    openGraph: {
      title: topic.name,
      description: `Goals for ${topic.name}.`,
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
      <header>
        <a href="/pick" className="text-sm text-zinc-400 hover:text-white">
          Back
        </a>
      </header>
      <main className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{topic.name}</h1>
        <Freshness path={path} />
        <ul className="mt-8 flex flex-col gap-3">
          {topic.goals.map((goal) => (
            <li key={goal.task}>
              <a
                href={`/tasks/${goal.task}`}
                className="block rounded-2xl border border-zinc-800 px-4 py-3 text-zinc-100 hover:border-zinc-600"
              >
                {goal.label}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
