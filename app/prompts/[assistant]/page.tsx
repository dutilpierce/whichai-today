import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
import guidesFile from "@/lib/prompt-guides.json";
import models from "@/lib/models.json";
import tasksFile from "@/lib/tasks.json";

const guides = guidesFile.guides as Record<
  string,
  {
    name: string;
    provider: string;
    source_url: string;
    tips: { text: string; source_url: string }[];
    tasks: string[];
  }
>;

export function generateStaticParams() {
  return Object.keys(guides).map((assistant) => ({ assistant }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ assistant: string }>;
}): Promise<Metadata> {
  const { assistant } = await params;
  const guide = guides[assistant];
  if (!guide) return {};
  const title = `Best prompts for ${guide.name}`;
  const description = `Practical prompting tips from ${guide.provider}'s official guide, plus task templates and where ${guide.name} leads today.`;
  return {
    title,
    description,
    alternates: { canonical: `/prompts/${assistant}` },
    openGraph: {
      title,
      description,
      url: `https://whichai.today/prompts/${assistant}`,
      siteName: "WhichAI.today",
      type: "website",
    },
  };
}

export default async function PromptGuidePage({
  params,
}: {
  params: Promise<{ assistant: string }>;
}) {
  const { assistant } = await params;
  const guide = guides[assistant];
  if (!guide) notFound();
  const leads = Object.values(models.categories).filter((category) => category.leader.provider === guide.provider);
  const tasks = guide.tasks
    .map((slug) => tasksFile.tasks.find((task) => task.slug === slug))
    .filter((task) => task !== undefined);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Best prompts for {guide.name}</h1>
        <Freshness path={`/prompts/${assistant}`} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          These tips are drawn from {guide.provider}&apos;s official prompting guide. Each one links the source.
        </p>
        <ol className="mt-6 flex list-decimal flex-col gap-3 pl-5 text-sm leading-6 text-zinc-300">
          {guide.tips.map((tip) => (
            <li key={tip.text}>
              {tip.text}{" "}
              <a href={tip.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                Source
              </a>
            </li>
          ))}
        </ol>
        <h2 className="mt-10 text-2xl font-semibold text-white">Where {guide.name} leads today</h2>
        {leads.length ? (
          <ul className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
            {leads.map((category) => (
              <li key={category.slug}>
                <a href={`/${category.slug}`} className="text-emerald-300 hover:text-emerald-200">
                  {category.emoji} {category.display_name}
                </a>
                : {category.leader.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">{guide.name} does not lead a ranked category today.</p>
        )}
        <h2 className="mt-10 text-2xl font-semibold text-white">Task templates</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {tasks.map((task) => (
            <li key={task.slug}>
              <a href={`/tasks/${task.slug}`} className="text-emerald-300 hover:text-emerald-200">
                Best AI for {task.title}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
