import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModelCard } from "@/components/ModelCard";
import { EmailSignup } from "@/components/EmailSignup";
import { EmbedBadge } from "@/components/EmbedBadge";
import { FaqList } from "@/components/FaqList";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import models from "@/lib/models.json";
import { categoryFaqs, categoryItemList, faqNode, pageGraph } from "@/lib/schema";
import { categoryBySlug, categoryEntries, categoryHeading, formatDay, historyBlurb, historyFor, latestChange, leaderLine, shortLabel } from "@/lib/picks";

export function generateStaticParams() {
  return Object.values(models.categories).map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const found = categoryBySlug(slug);
  if (!found) return {};
  const heading = categoryHeading(slug);
  const description = `${found.category.leader.name} leads ${found.category.display_name.toLowerCase()} right now. ${found.category.leader.why}`;
  const url = `https://whichai.today/${slug}`;
  return {
    title: heading,
    description,
    alternates: {
      canonical: `/${slug}`,
      types: {
        "application/rss+xml": "https://whichai.today/feed.xml",
      },
    },
    openGraph: {
      title: heading,
      description,
      url,
      siteName: "WhichAI.today",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: heading,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const found = categoryBySlug(slug);
  if (!found) notFound();

  const { key, category } = found;
  const heading = categoryHeading(slug);
  const latest = latestChange(key);
  const log = historyFor(key);
  const others = categoryEntries().filter(([entryKey]) => entryKey !== key);
  const faqs = categoryFaqs(category, latest);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <JsonLd
        data={pageGraph(`/${slug}`, [
          { name: "Home", path: "/" },
          { name: category.display_name, path: `/${slug}` },
        ], [faqNode(faqs), categoryItemList(category)])}
      />
      <header className="flex items-center justify-between">
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
        <a href="/about" className="text-sm font-medium text-zinc-400 hover:text-white">
          About
        </a>
      </header>
      <main className="mt-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {heading}
        </h1>
        <Freshness path={`/${slug}`} />
        <p className="mt-4 text-base leading-7 text-zinc-300">{leaderLine(latest)}</p>
        <p className="mt-2 text-base leading-7 text-zinc-400">
          {category.leader.why} These picks are readable without an account, and the details behind each one are on the card.
        </p>
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
        <div className="mt-8">
          <EmailSignup />
        </div>

        <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">Leader history</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {log.map((entry) => (
            <li key={`${entry.date}-${entry.leader}`} className="text-sm leading-6 text-zinc-300">
              <span className="text-white">{formatDay(entry.date)}. </span>
              {historyBlurb(entry)}
              {entry.evidence}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-zinc-400">
          A new number one has to show up on two daily checks before it replaces the current leader.{" "}
          <a href="/alerts" className="text-zinc-200 hover:text-white">
            Get alerts
          </a>
          .
        </p>
        <EmbedBadge
          html={`<a href="https://whichai.today/${category.slug}"><img src="https://whichai.today/badge/${category.slug}" alt="Today's best ${shortLabel(category.slug).toLowerCase()} AI: ${category.leader.name}, via WhichAI.today" width="320" height="40"></a>`}
          src={`/badge/${category.slug}`}
          alt={`Today's best ${shortLabel(category.slug).toLowerCase()} AI: ${category.leader.name}, via WhichAI.today`}
          href={`https://whichai.today/${category.slug}`}
        />

        <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">Questions</h2>
        <div className="mt-6 flex flex-col gap-6">
          {faqs.map((faq) => (
            <section key={faq.question}>
              <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-base leading-7 text-zinc-300">{faq.answer}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">Other jobs</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {others.map(([, item]) => (
            <li key={item.slug}>
              <a href={`/${item.slug}`} className="text-sm text-zinc-300 hover:text-white">
                {item.emoji} {item.display_name}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
