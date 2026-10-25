import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyText } from "@/components/CopyText";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { ModelCard } from "@/components/ModelCard";
import { appsWithCapability } from "@/lib/apps";
import { categoryBySlug } from "@/lib/picks";
import { pageGraph } from "@/lib/schema";
import { sensitiveKind, sensitiveLine } from "@/lib/sensitive";
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
  const capability = "capability" in task ? task.capability : "";
  const found = capability ? null : categoryBySlug(task.category);
  if (!capability && !found) notFound();
  const category = found?.category;
  const title = `Best AI for ${task.title} right now`;
  const path = `/tasks/${slug}`;
  const notice = sensitiveLine(sensitiveKind(`${task.title}. ${task.caution}`));
  const capable = capability ? appsWithCapability(capability) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <JsonLd
        data={pageGraph(path, [
          { name: "Home", path: "/" },
          { name: "Tasks", path: "/tasks" },
          { name: title, path },
        ], [])}
      />
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">{task.tip}</p>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{task.measured}</p>
        {notice ? <p className="mt-4 text-sm leading-6 text-amber-200/90">{notice}</p> : null}
        <h2 className="mt-8 text-lg font-semibold text-white">Try this prompt</h2>
        <CopyText value={task.starter_prompt} label="Copy prompt" />
        <p className="mt-6 text-base leading-7 text-zinc-300">{task.caution}</p>
        {category ? (
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
        ) : (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white">Apps that say they can do this</h2>
            {capable.length ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
                {capable.map((app) => (
                  <li key={app.slug}>
                    <a href={app.link} className="text-emerald-300 hover:text-emerald-200">
                      {app.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">No app in the table is stored as able to do this yet.</p>
            )}
          </div>
        )}
        <p className="mt-8 text-sm">
          {category ? (
            <a href={`/${category.slug}`} className="text-emerald-300 hover:text-emerald-200">
              {category.emoji} More on {category.display_name}
            </a>
          ) : (
            <a href="/which-ai-should-i-use" className="text-emerald-300 hover:text-emerald-200">
              Which AI should I use
            </a>
          )}
          <a href="/prompt-builder" className="ml-4 text-zinc-400 hover:text-white">
            Prompt builder
          </a>
        </p>
      </main>
    </div>
  );
}
