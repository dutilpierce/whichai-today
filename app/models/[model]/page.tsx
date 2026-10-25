import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/FaqList";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { appsOffering, offerFor, planPrice } from "@/lib/apps";
import { modelBySlug, modelRecords, historyMentioning } from "@/lib/catalog";
import { ACCESS_LABEL, formatDay, historyBlurb } from "@/lib/picks";
import { faqNode, modelFaqs, pageGraph } from "@/lib/schema";
import providers from "@/lib/providers.json";

export function generateStaticParams() {
  return modelRecords().map((model) => ({ model: model.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model: string }>;
}): Promise<Metadata> {
  const { model: slug } = await params;
  const found = modelBySlug(slug);
  if (!found) return {};
  const title = found.name;
  const description = found.archived
    ? `${found.name} is not currently a pick on WhichAI.today. Its earlier record is kept here.`
    : `${found.name} from ${found.provider} is a current WhichAI.today pick.`;
  const url = `https://whichai.today/models/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/models/${slug}` },
    openGraph: { title, description, url, siteName: "WhichAI.today", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model: slug } = await params;
  const found = modelBySlug(slug);
  if (!found) notFound();

  const privacy = providers[found.provider as keyof typeof providers];
  const log = historyMentioning(found.name);
  const access = "access" in found.profile ? found.profile.access : "";
  const faqs = modelFaqs(found, privacy);
  const category = found.roles[0];
  const crumbs = [
    { name: "Home", path: "/" },
    ...(category
      ? [{ name: category.display_name, path: `/${category.slug}` }]
      : []),
    { name: found.name, path: `/models/${slug}` },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd data={pageGraph(`/models/${slug}`, crumbs, faqs.length ? [faqNode(faqs)] : [])} />
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{found.name}</h1>
        <Freshness path={`/models/${slug}`} />
        <p className="mt-2 text-sm text-zinc-400">{found.provider}</p>
        {found.archived ? (
          <p className="mt-4 text-base text-amber-200">Not currently a pick.</p>
        ) : null}
        <p className="mt-4 text-base leading-7 text-zinc-300">{found.profile.where_to_get}</p>
        {access ? (
          <p className="mt-3 inline-block rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">
            {ACCESS_LABEL[access as keyof typeof ACCESS_LABEL] ?? access}
          </p>
        ) : null}
        <dl className="mt-8 flex flex-col gap-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Cost</dt>
            <dd className="mt-1 text-sm leading-6 text-zinc-300">{found.profile.cost}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Free tier</dt>
            <dd className="mt-1 text-sm leading-6 text-zinc-300">{found.profile.free_tier}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Privacy default</dt>
            <dd className="mt-1 text-sm leading-6 text-zinc-300">
              {privacy ? (
                <>
                  {privacy.trains_by_default} {privacy.opt_out}{" "}
                  <a href={privacy.source_url} className="text-emerald-300 hover:text-emerald-200">
                    Source
                  </a>
                </>
              ) : (
                "Privacy default not checked for this provider yet."
              )}
            </dd>
          </div>
        </dl>

        {appsOffering(found.name).length ? (
          <>
            <h2 className="mt-12 text-2xl font-semibold text-white">Apps that offer this model</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {appsOffering(found.name).map((app) => {
                const offer = offerFor(app, found.name);
                return (
                  <li key={app.slug} className="text-sm leading-6 text-zinc-300">
                    <a href={app.link} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                      {app.name}
                    </a>
                    {": "}
                    {offer.offered?.plan ?? offer.plan?.name}
                    {offer.plan ? `, ${planPrice(offer.plan.price_usd_month)}` : ""}
                    {`, free tier ${offer.free ? "yes" : "no"}, ${app.skill}.`}
                    {offer.plan?.source_url ? (
                      <>
                        {" "}
                        <a href={offer.plan.source_url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                          Source
                        </a>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        <h2 className="mt-12 text-2xl font-semibold text-white">Where it ranks</h2>
        {found.roles.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {found.roles.map((role) => (
              <li key={`${role.slug}-${role.role}`}>
                <a href={`/${role.slug}`} className="text-sm text-zinc-300 hover:text-white">
                  {role.emoji} {role.display_name}: {role.role}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">It is not in any current category.</p>
        )}

        <h2 className="mt-12 text-2xl font-semibold text-white">Leader history</h2>
        {log.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {log.map((entry) => (
              <li key={`${entry.date}-${entry.category}-${entry.leader}`} className="text-sm leading-6 text-zinc-300">
                <span className="text-white">{formatDay(entry.date)}. </span>
                {historyBlurb(entry)}
                {entry.evidence}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">No leader change mentions this model yet.</p>
        )}
        <FaqList faqs={faqs} />
      </main>
    </div>
  );
}
