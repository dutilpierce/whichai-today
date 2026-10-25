import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyText } from "@/components/CopyText";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { ModelCard } from "@/components/ModelCard";
import { categoryBySlug } from "@/lib/picks";
import { pageGraph } from "@/lib/schema";
import tasksFile from "@/lib/tasks.json";

export function generateStaticParams() {
  return tasksFile.tasks.map((task) => ({ task: task.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ task: string }>;
}): Promise<Metadata> {
  const { task: slug } = await params;
  const task = tasksFile.tasks.find((item) => item.slug === slug);
  if (!task) return {};
  const title = `Best AI for ${task.title} right now`;
  return {
    title,
    description: task.tip,
    alternates: { canonical: `/tasks/${slug}` },
    openGraph: {
      title,
      description: task.tip,
      url: `https://whichai.today/tasks/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: task.tip },
  };
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ task: string }>;
}) {
  const { task: slug } = await params;
  const task = tasksFile.tasks.find((item) => item.slug === slug);
  if (!task) notFound();
  const found = categoryBySlug(task.category);
  if (!found) notFound();
  const { category } = found;
  const title = `Best AI for ${task.title} right now`;
  const path = `/tasks/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <JsonLd
        data={pageGraph(path, [
          { name: "Home", path: "/" },
          { name: "Tasks", path: "/tasks" },
          { name: title, path },
        ], [])}
      />
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">{task.tip}</p>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{task.measured}</p>
        <h2 className="mt-8 text-lg font-semibold text-white">Try this prompt</h2>
        <CopyText value={task.starter_prompt} label="Copy prompt" />
        <p className="mt-6 text-base leading-7 text-zinc-300">{task.caution}</p>
        <div className="mt-8 flex flex-col gap-4">
          <ModelCard
            model={category.leader}
            label="#1 Champion"
            signal={category.primary_signal}
            leaderScore={category.leader.primary_score}
            runnerScore={category.runner_up.primary_score}
            featured
          />
          <div className="grid gap-4 md:grid-cols-2">
            <ModelCard model={category.runner_up} label="Top Alternative" />
            <ModelCard model={category.open_source_pick} label="Best Open Source" />
          </div>
        </div>
        <p className="mt-8 text-sm">
          <a href={`/${category.slug}`} className="text-emerald-300 hover:text-emerald-200">
            {category.emoji} More on {category.display_name}
          </a>
          <a href="/prompt-builder" className="ml-4 text-zinc-400 hover:text-white">
            Prompt builder
          </a>
        </p>
      </main>
    </div>
  );
}
