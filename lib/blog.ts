import data from "./blog.json";
import { confirmedChanges, isHeld } from "./catalog";
import { formatDay } from "./picks";
import { releaseEntries, type Release } from "./releases";

/**
 * The weekly roundup. Each post is drafted from this site's own tracked data
 * (releases, ranking changes, leaders) by scripts/draft-weekly.mjs and stored in
 * lib/blog.json, newest first. Body text is plain prose with [text](url) links;
 * nothing is rendered as raw HTML.
 */
export type BlogSection = { id: string; heading: string; paragraphs: string[] };
export type BlogFaq = { question: string; answer: string };
export type BlogLink = { name: string; url: string };

export type BlogPost = {
  week: string;
  slug: string;
  start: string;
  end: string;
  published: string;
  updated: string;
  title: string;
  description: string;
  takeaways: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
  companies: BlogLink[];
  sources: BlogLink[];
  writer: string;
};

export const BLOG_NAME = "WhichAI.today Weekly";

export function blogPosts(): BlogPost[] {
  return (data.posts as BlogPost[]).filter((post) => !isHeld(`/blog/${post.slug}`));
}

export function postBySlug(slug: string) {
  return blogPosts().find((post) => post.slug === slug) ?? null;
}

export function postByWeek(week: string) {
  return blogPosts().find((post) => post.week === week) ?? null;
}

/** Older and newer neighbours, for the links at the end of a post. */
export function neighbours(post: BlogPost) {
  const posts = blogPosts();
  const index = posts.findIndex((item) => item.slug === post.slug);
  return { newer: posts[index - 1] ?? null, older: posts[index + 1] ?? null };
}

export function inWeek(date: string, post: Pick<BlogPost, "start" | "end">) {
  const day = date.slice(0, 10);
  return day >= post.start && day <= post.end;
}

/** Every tracked release dated inside the post's week, oldest first. */
export function postReleases(post: BlogPost): Release[] {
  return releaseEntries()
    .filter((entry) => inWeek(entry.date, post))
    .sort((a, b) => a.date.localeCompare(b.date) || a.provider.localeCompare(b.provider));
}

/** Confirmed #1 changes inside the post's week. */
export function postChanges(post: BlogPost) {
  return confirmedChanges().filter((change) => inWeek(change.date, post));
}

/** "Nov 9 – Nov 15, 2026" */
export function weekRange(post: Pick<BlogPost, "start" | "end">) {
  const start = formatDay(post.start).replace(/, \d{4}$/, "");
  return `${start} – ${formatDay(post.end)}`;
}

/** "Week 46" from "2026-W46". */
export function weekLabel(week: string) {
  return `Week ${Number(week.slice(-2))}`;
}

const LINK = /\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]*)\)/g;

export type Inline = { text: string; url?: string };

/** Split prose into text runs and [text](url) links. */
export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], url: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** The same prose with links reduced to their text, as a reader sees it. */
export function plainText(text: string) {
  return parseInline(text)
    .map((part) => part.text)
    .join("");
}

export function postWords(post: BlogPost) {
  const text = [
    post.description,
    ...post.takeaways,
    ...post.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...post.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ]
    .map(plainText)
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function postUrl(post: Pick<BlogPost, "slug">) {
  return `https://whichai.today/blog/${post.slug}`;
}
