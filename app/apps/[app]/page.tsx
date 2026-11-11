import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqList } from "@/components/FaqList";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { appList, planPrice, type AppRecord } from "@/lib/apps";
import { currentModels } from "@/lib/catalog";
import pairsFile from "@/lib/pairs.json";
import { categoryEntries, modelSlug } from "@/lib/picks";
import { faqNode, pageGraph, type Faq } from "@/lib/schema";

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

const SKILL: Record<string, string> = {
  Beginner: "It works in a browser or app with no setup, so it suits anyone.",
  "Some setup": "It takes a little setup before the first use.",
  Technical: "It suits people comfortable with technical tools.",
};

const ROLE_PHRASE: Record<string, string> = {
  Leader: "#1",
  Alternative: "alternative",
  "Open weights": "open-weights pick",
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
  const title = `${app.name}: price, free plan, privacy, and the AI models it offers`;
  const can = Object.entries(CAPABILITY_LABELS)
    .filter(([key]) => key !== "team_plan" && app.capabilities?.[key])
    .map(([, label]) => label.toLowerCase());
  const description = [
    pricing(app),
    app.models.length ? `Models you can use: ${app.models.map((model) => model.name).join(", ")}.` : "",
    can.length ? `It can do ${can.join(", ")}.` : "",
    "Plus what it does with your chats.",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title,
    description,
    alternates: { canonical: `/apps/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://whichai.today/apps/${slug}`,
      siteName: "WhichAI.today",
      type: "website",
    },
  };
}

function pricing(app: AppRecord) {
  const paid = app.plans
    .map((plan) => plan.price_usd_month)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const free = app.plans.some((plan) => plan.price_usd_month === 0);
  const from = paid.length ? `paid plans from ${planPrice(Math.min(...paid))}` : "no paid plan stored";
  return `${app.name} has ${free ? "a free plan" : "no free plan"} and ${from}.`;
}

/** Each model the app offers, with where it ranks today. */
function offered(app: AppRecord) {
  const ranked = new Map(currentModels().map((model) => [model.name, model]));
  return app.models.map((model) => ({ ...model, ranked: ranked.get(model.name) ?? null }));
}

function appFaqs(app: AppRecord, models: ReturnType<typeof offered>): Faq[] {
  const free = app.plans.find((plan) => plan.price_usd_month === 0);
  return [
    {
      question: `Is ${app.name} free?`,
      answer: free ? `Yes. ${app.name} has a free plan: ${free.free_tier}` : `No. ${app.name} has no free plan stored here.`,
    },
    {
      question: `How much does ${app.name} cost?`,
      answer: app.plans.map((plan) => `${plan.name}: ${planPrice(plan.price_usd_month)}.`).join(" "),
    },
    {
      question: `Which AI models can I use in ${app.name}?`,
      answer: models.length
        ? `${models.map((model) => `${model.name} (${model.plan} plan)`).join(", ")}.`
        : `No model that ranks on this site is stored for ${app.name}.`,
    },
    {
      question: `Does ${app.name} train on my chats?`,
      answer: `${app.privacy.trains_by_default} To opt out: ${app.privacy.opt_out}`,
    },
  ];
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
  const models = offered(app);
  const faqs = appFaqs(app, models);
  const versus = pairsFile.pairs.filter((pair) => pair.left === slug || pair.right === slug);
  const names = new Map(appList().map((item) => [item.slug, item.name]));
  const crumbs = [
    { name: "Home", path: "/" },
    { name: app.name, path },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(path, crumbs, [faqNode(faqs)])} />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{app.name}</h1>
        <Freshness path={path} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          {app.name} is made by {app.maker}. {SKILL[app.skill] ?? ""} {pricing(app)}
        </p>
        {best.length ? (
          <>
            <h2 className="mt-10 text-xl font-semibold text-white">Best at today</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              {best.map(([, category]) => (
                <li key={category.slug}>
                  <Link href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                    {category.display_name}
                  </Link>
                  : offers {category.leader.name}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {models.length ? (
          <>
            <h2 className="mt-10 text-xl font-semibold text-white">AI models you can use in {app.name}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              {models.map((model) => (
                <li key={model.name}>
                  {model.ranked ? (
                    <Link href={`/models/${modelSlug(model.name)}`} className="text-zinc-100 hover:text-white">
                      {model.name}
                    </Link>
                  ) : (
                    <span className="text-zinc-100">{model.name}</span>
                  )}{" "}
                  <span className="text-zinc-500">({model.plan} plan)</span>
                  {model.ranked?.roles.length
                    ? `: ${model.ranked.roles
                        .map((role) => `${ROLE_PHRASE[role.role] ?? role.role} for ${role.display_name.toLowerCase()}`)
                        .join(", ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </>
        ) : null}
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
        {versus.length ? (
          <>
            <h2 className="mt-10 text-xl font-semibold text-white">Compare {app.name}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {versus.map((pair) => (
                <li key={pair.slug}>
                  <Link
                    href={`/vs/${pair.slug}`}
                    className="inline-block rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
                  >
                    {names.get(pair.left) ?? pair.left} vs {names.get(pair.right) ?? pair.right}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <FaqList faqs={faqs} />
        <p className="mt-8 text-sm">
          <a href={app.link} className="text-emerald-300 hover:text-emerald-200">
            Open {app.name}
          </a>
        </p>
      </main>
    </div>
  );
}
