import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import {
  blogPosts,
  neighbours,
  plainText,
  postBySlug,
  postChanges,
  postReleases,
  postWords,
  weekLabel,
  weekRange,
} from "@/lib/blog";
import { formatDay } from "@/lib/picks";
import { KIND_LABEL, sourceHost } from "@/lib/releases";
import { releaseIndexed } from "@/lib/release-rows";
import { blogPosting, faqNode, pageGraph, releaseItemList } from "@/lib/schema";

export function generateStaticParams() {
  const posts = blogPosts();
  return posts.length ? posts.map((post) => ({ slug: post.slug })) : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  const url = `https://whichai.today/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: "WhichAI.today",
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated,
      section: "AI news",
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

const h2 = "mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-white";
const body = "mt-4 text-base leading-8 text-zinc-300";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  const releases = postReleases(post);
  const changes = postChanges(post);
  const words = postWords(post);
  const minutes = Math.max(1, Math.round(words / 230));
  const { newer, older } = neighbours(post);
  const path = `/blog/${post.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: `${weekLabel(post.week)}, ${post.start.slice(0, 4)}`, path },
  ];
  const faqs = post.faqs.map((faq) => ({ question: faq.question, answer: plainText(faq.answer) }));
  const contents = [
    ...post.sections.map((section) => ({ id: section.id, heading: section.heading })),
    ...(releases.length ? [{ id: "every-release", heading: "Every release this week" }] : []),
    ...(changes.length ? [{ id: "ranking-changes", heading: "Ranking changes" }] : []),
    ...(faqs.length ? [{ id: "questions", heading: "Questions people are asking" }] : []),
    { id: "sources", heading: "Sources" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={pageGraph(path, crumbs, [
          blogPosting(post, words, releases.map((release) => release.name)),
          ...(faqs.length ? [faqNode(faqs)] : []),
          ...(releases.length
            ? [releaseItemList(`AI releases, ${weekRange(post)}`, releases)]
            : []),
        ])}
      />
      <main>
        <article>
          <Breadcrumbs crumbs={crumbs} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
            {weekLabel(post.week)} · {weekRange(post)}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">{post.description}</p>
          <p className="mt-4 text-sm text-zinc-500">
            By <Link href="/about" className="hover:text-white">WhichAI.today</Link> · Published{" "}
            <time dateTime={post.published}>{formatDay(post.published)}</time>
            {post.updated !== post.published ? (
              <>
                {" "}· Updated <time dateTime={post.updated}>{formatDay(post.updated)}</time>
              </>
            ) : null}{" "}
            · {minutes} min read
          </p>

          <section
            aria-labelledby="takeaways"
            className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
          >
            <h2 id="takeaways" className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Key takeaways
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-base leading-7 text-zinc-200 marker:text-emerald-300">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway}>
                  <RichText text={takeaway} />
                </li>
              ))}
            </ul>
          </section>

          <nav aria-labelledby="contents" className="mt-8">
            <h2 id="contents" className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              In this issue
            </h2>
            <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-300 marker:text-zinc-500">
              {contents.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="hover:text-white">
                    {item.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {post.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className={h2}>
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className={body}>
                  <RichText text={paragraph} />
                </p>
              ))}
            </section>
          ))}

          {releases.length ? (
            <section aria-labelledby="every-release">
              <h2 id="every-release" className={h2}>
                Every release this week
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {releases.length} tracked release{releases.length === 1 ? "" : "s"}, each linked to its official
                announcement.
              </p>
              <ol className="mt-5 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                {releases.map((release) => (
                  <li key={release.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[6rem_1fr_auto] sm:items-baseline sm:gap-4">
                    <span className="text-xs text-zinc-500">{formatDay(release.date).replace(/, \d{4}$/, "")}</span>
                    <p className="text-sm text-zinc-200">
                      <span className="text-zinc-400">{release.provider}</span>{" "}
                      {releaseIndexed(release) ? (
                        <Link href={`/releases/${release.id}`} className="font-medium text-white hover:text-emerald-300">
                          {release.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-white">{release.name}</span>
                      )}
                      <span className="ml-2 text-xs text-zinc-500">{KIND_LABEL[release.kind]}</span>
                    </p>
                    <a
                      href={release.source_url}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      {sourceHost(release.source_url)} ↗
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {changes.length ? (
            <section aria-labelledby="ranking-changes">
              <h2 id="ranking-changes" className={h2}>
                Ranking changes
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {changes.map((change) => (
                  <li key={change.id} className="text-base leading-7 text-zinc-300">
                    <Link href={`/changes/${change.id}`} className="font-medium text-white hover:text-emerald-300">
                      {change.category.display_name}: {change.leader} overtook {change.previous}
                    </Link>{" "}
                    <span className="text-sm text-zinc-500">{formatDay(change.date)}</span>
                    <span className="block text-sm text-zinc-400">{change.evidence}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {faqs.length ? (
            <section aria-labelledby="questions">
              <h2 id="questions" className={h2}>
                Questions people are asking
              </h2>
              <dl className="mt-4 flex flex-col gap-5">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt className="font-medium text-white">{faq.question}</dt>
                    <dd className="mt-1 text-base leading-7 text-zinc-300">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section aria-labelledby="sources">
            <h2 id="sources" className={h2}>
              Sources
            </h2>
            <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-400 marker:text-zinc-500">
              {post.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener" className="hover:text-white">
                    {source.name}
                  </a>{" "}
                  <span className="text-zinc-500">({sourceHost(source.url)})</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-zinc-500">
              Rankings and release data come from WhichAI.today&apos;s ongoing tracking. See the{" "}
              <Link href="/methodology" className="hover:text-white">
                methodology
              </Link>
              , the{" "}
              <Link href="/releases" className="hover:text-white">
                full release timeline
              </Link>
              , or this week as{" "}
              <a href={`/data/weekly/${post.week}.json`} className="hover:text-white">
                open data (JSON)
              </a>
              .
            </p>
          </section>
        </article>

        <nav aria-label="More weeks" className="mt-12 grid gap-3 border-t border-zinc-800 pt-6 sm:grid-cols-2">
          {older ? (
            <Link href={`/blog/${older.slug}`} className="group">
              <span className="text-xs text-zinc-500">← {weekLabel(older.week)}</span>
              <span className="mt-1 block text-sm font-medium text-zinc-200 group-hover:text-white">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/blog/${newer.slug}`} className="group sm:text-right">
              <span className="text-xs text-zinc-500">{weekLabel(newer.week)} →</span>
              <span className="mt-1 block text-sm font-medium text-zinc-200 group-hover:text-white">{newer.title}</span>
            </Link>
          ) : null}
        </nav>
      </main>
    </div>
  );
}
