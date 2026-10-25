import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Freshness } from "@/components/Freshness";
import { appList, planPrice, type AppRecord } from "@/lib/apps";
import { categoryEntries } from "@/lib/picks";

const CAPABILITY_LABELS: Record<string, string> = {
  web_search: "Web search",
  file_upload: "File upload",
  image_generation: "Image generation",
  video_generation: "Video generation",
  presentations: "Presentations",
  code_editing: "Code editing",
  voice: "Voice",
  team_plan: "Team plan",
};

export function generateStaticParams() {
  const apps = appList();
  if (!apps.length) return [{ app: "_none" }];
  return apps.map((app) => ({ app: app.slug }));
}

function findApp(slug: string) {
  return appList().find((app) => app.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ app: string }>;
}): Promise<Metadata> {
  const { app: slug } = await params;
  const app = findApp(slug);
  if (!app) return {};
  const title = `${app.name} — what it is best at today`;
  return {
    title,
    description: `Plans, privacy, and the jobs ${app.name} currently offers a leading model for.`,
    alternates: { canonical: `/apps/${slug}` },
    openGraph: {
      title,
      description: `Plans, privacy, and today's jobs for ${app.name}.`,
      url: `https://whichai.today/apps/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
  };
}

function leads(app: AppRecord) {
  const names = new Set(app.models.map((model) => model.name));
  return categoryEntries().filter(([, category]) => names.has(category.leader.name));
}

export default async function AppPage({ params }: { params: Promise<{ app: string }> }) {
  const { app: slug } = await params;
  const app = findApp(slug);
  if (!app) notFound();
  const best = leads(app);
  const caps = Object.entries(CAPABILITY_LABELS).filter(([key]) => app.capabilities?.[key]);
  const path = `/apps/${slug}`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{app.name}</h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          {app.name} is made by {app.maker}. Skill level stored for it: {app.skill}.
        </p>
        <h2 className="mt-10 text-xl font-semibold text-white">Best at today</h2>
        {best.length ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
            {best.map(([, category]) => (
              <li key={category.slug}>
                <a href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                  {category.display_name}
                </a>
                : offers {category.leader.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">This app does not currently offer a category leader.</p>
        )}
        <h2 className="mt-10 text-xl font-semibold text-white">Plans</h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm text-zinc-300">
          {app.plans.map((plan) => (
            <li key={plan.name}>
              <p>
                {plan.name}: {planPrice(plan.price_usd_month)}. {plan.free_tier}
              </p>
              <a href={plan.source_url} className="text-emerald-300 hover:text-emerald-200">
                Source
              </a>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 text-xl font-semibold text-white">Privacy default</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{app.privacy.trains_by_default}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Opt out: {app.privacy.opt_out}</p>
        <a href={app.privacy.source_url} className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200">
          Source
        </a>
        <h2 className="mt-10 text-xl font-semibold text-white">What it says it can do</h2>
        {caps.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {caps.map(([key, label]) => (
              <li key={key} className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">No capabilities are stored as yes.</p>
        )}
        <p className="mt-8 text-sm">
          <a href={app.link} className="text-emerald-300 hover:text-emerald-200">
            Open {app.name}
          </a>
        </p>
      </main>
    </div>
  );
}
