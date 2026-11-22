import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { BLOG_NAME, blogPosts, postReleases, weekLabel, weekRange } from "@/lib/blog";
import { pageGraph } from "@/lib/schema";

const title = "AI news this week: the weekly roundup";
const description =
  "Every week's new AI models, updates, and ranking changes in one sourced roundup, with links to each company's announcement. Published every Monday.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "https://whichai.today/blog/feed.xml" },
  },
  openGraph: { title, description, url: "https://whichai.today/blog", siteName: "WhichAI.today", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function BlogIndex() {
  const posts = blogPosts();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={pageGraph("/blog", crumbs, [
          {
            "@type": "Blog",
            name: BLOG_NAME,
            url: "https://whichai.today/blog",
            description,
            publisher: { "@type": "Organization", name: "WhichAI.today", url: "https://whichai.today" },
            blogPost: posts.map((post) => ({
              "@type": "BlogPosting",
              headline: post.title.slice(0, 110),
              url: `https://whichai.today/blog/${post.slug}`,
              datePublished: post.published,
            })),
          },
        ])}
      />
      <main>
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          A sourced summary of what changed in AI each week: new models and features, who moved up the rankings,
          and why it matters. Built from WhichAI.today&apos;s release and ranking tracking.{" "}
          <a href="/blog/feed.xml" className="text-emerald-300 hover:text-emerald-200">
            RSS feed
          </a>
          .
        </p>

        {posts.length ? (
          <ol className="mt-10 flex flex-col gap-4">
            {posts.map((post, index) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 sm:p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    {weekLabel(post.week)} · {weekRange(post)}
                    {index === 0 ? <span className="ml-2 text-zinc-500">Latest</span> : null}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white group-hover:text-emerald-300">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{post.description}</p>
                  <p className="mt-3 text-xs text-zinc-500">{postReleases(post).length} releases tracked</p>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
            The first weekly roundup is on its way. Until then, the{" "}
            <Link href="/releases" className="text-emerald-300 hover:text-emerald-200">
              release timeline
            </Link>{" "}
            is updated every few hours.
          </p>
        )}

        {posts[0] ? (
          <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">This week in brief</h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-zinc-300 marker:text-emerald-300">
              {posts[0].takeaways.map((takeaway) => (
                <li key={takeaway}>
                  <RichText text={takeaway} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
