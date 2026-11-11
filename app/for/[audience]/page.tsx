import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
import { TaskPicks, taskPick } from "@/components/TaskPicks";
import { sensitiveKind, sensitiveLine } from "@/lib/sensitive";
import audiencesFile from "@/lib/audiences.json";
import tasksFile from "@/lib/tasks.json";

export function generateStaticParams() {
  return audiencesFile.audiences.map((audience) => ({ audience: audience.slug }));
}

function findAudience(slug: string) {
  return audiencesFile.audiences.find((audience) => audience.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string }>;
}): Promise<Metadata> {
  const { audience: slug } = await params;
  const audience = findAudience(slug);
  if (!audience) return {};
  const title = `Best AI for ${audience.name.toLowerCase()}`;
  const picks = audience.tasks
    .map((task) => {
      const row = taskPick(task);
      return row?.pick ? `${row.task.title}, ${row.pick}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const description = `Today's picks for ${audience.name.toLowerCase()}: ${picks}. ${audience.caution}`;
  return {
    title,
    description,
    alternates: { canonical: `/for/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://whichai.today/for/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
  };
}

export default async function AudiencePage({ params }: { params: Promise<{ audience: string }> }) {
  const { audience: slug } = await params;
  const audience = findAudience(slug);
  if (!audience) notFound();
  const tasks = audience.tasks.map((taskSlug) => tasksFile.tasks.find((task) => task.slug === taskSlug));
  if (tasks.some((task) => !task)) notFound();
  const path = `/for/${slug}`;
  const notice = sensitiveLine(sensitiveKind(audience.caution));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Best AI for {audience.name.toLowerCase()}
        </h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">{audience.free}</p>
        <p className="mt-4 text-base leading-7 text-amber-200/90">{audience.caution}</p>
        {notice ? <p className="mt-4 text-sm leading-6 text-zinc-400">{notice}</p> : null}
        <h2 className="mt-10 text-xl font-semibold text-white">Today&apos;s pick for each task</h2>
        <TaskPicks slugs={tasks.map((task) => task!.slug)} />
        <p className="mt-8 text-sm">
          <Link href="/free" className="text-emerald-300 hover:text-emerald-200">Best free AI</Link>
          <Link href="/which-ai-should-i-use" className="ml-4 text-zinc-400 hover:text-white">Which AI should I use</Link>
        </p>
      </main>
    </div>
  );
}
