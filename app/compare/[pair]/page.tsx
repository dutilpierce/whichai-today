import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/FaqList";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { compareByPair, compareRecords } from "@/lib/catalog";
import { ACCESS_LABEL, modelSlug } from "@/lib/picks";
import { compareFaqs, faqNode, pageGraph } from "@/lib/schema";
import providers from "@/lib/providers.json";
import type { ModelProfile } from "@/lib/match";

export function generateStaticParams() {
  return compareRecords().map((item) => ({ pair: item.pair }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const found = compareByPair(pair);
  if (!found) return {};
  const title = `${found.leader.name} vs ${found.runner.name}`;
  const description = `Today's #1 and the alternative, side by side: evidence, cost, access, and privacy.`;
  const url = `https://whichai.today/compare/${pair}`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${pair}` },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Column({ model, label }: { model: ModelProfile; label: string }) {
  const privacy = providers[model.provider as keyof typeof providers];
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        <a href={`/models/${modelSlug(model.name)}`} className="hover:text-emerald-200">
          {model.name}
        </a>
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{model.provider}</p>
      <dl className="mt-6 flex flex-col gap-4 text-sm leading-6 text-zinc-300">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Evidence</dt>
          <dd className="mt-1">{model.benchmark_context}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Cost</dt>
          <dd className="mt-1">{model.cost}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Access</dt>
          <dd className="mt-1">{ACCESS_LABEL[model.access as keyof typeof ACCESS_LABEL] ?? model.access}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Privacy</dt>
          <dd className="mt-1">
            {privacy ? `${privacy.trains_by_default} ${privacy.opt_out}` : "Not checked yet."}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Pick this if</dt>
          <dd className="mt-1">{model.pick_if}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const found = compareByPair(pair);
  if (!found) notFound();
  const faqs = compareFaqs(found, (provider) => providers[provider as keyof typeof providers]);
  const category = found.categories[0];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: category.display_name, path: `/${category.slug}` },
    { name: `${found.leader.name} vs ${found.runner.name}`, path: `/compare/${pair}` },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(`/compare/${pair}`, crumbs, [faqNode(faqs)])} />
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {found.leader.name} vs {found.runner.name}
        </h1>
        <Freshness path={`/compare/${pair}`} />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          These are the current #1 and the alternative
          {found.categories.length === 1 ? " for " : " for "}
          {found.categories.map((category, index) => (
            <span key={category.slug}>
              {index > 0 ? ", " : ""}
              <a href={`/${category.slug}`} className="text-zinc-100 hover:text-white">
                {category.display_name}
              </a>
            </span>
          ))}
          .
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Column model={found.leader} label="#1" />
          <Column model={found.runner} label="Alternative" />
        </div>
        <FaqList faqs={faqs} />
      </main>
    </div>
  );
}
