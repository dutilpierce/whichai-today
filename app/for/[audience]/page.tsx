import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
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
  return {
    title,
    description: audience.caution,
    alternates: { canonical: `/for/${slug}` },
    openGraph: {
      title,
      description: audience.caution,
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
        <h2 className="mt-10 text-xl font-semibold text-white">Start with one of these</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task!.slug}>
              <a href={`/tasks/${task!.slug}`} className="text-sm text-zinc-300 hover:text-white">
                Best AI for {task!.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm">
          <a href="/free" className="text-emerald-300 hover:text-emerald-200">Best free AI</a>
          <a href="/which-ai-should-i-use" className="ml-4 text-zinc-400 hover:text-white">Which AI should I use</a>
        </p>
      </main>
    </div>
  );
}
