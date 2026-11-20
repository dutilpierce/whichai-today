import { BLOG_NAME, blogPosts, parseInline, plainText, postUrl, type BlogPost } from "@/lib/blog";

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Escaped for HTML; the whole document then goes inside CDATA. */
function html(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string) {
  return parseInline(text)
    .map((part) =>
      part.url
        ? `<a href="${html(part.url.startsWith("/") ? `https://whichai.today${part.url}` : part.url)}">${html(part.text)}</a>`
        : html(part.text),
    )
    .join("");
}

function content(post: BlogPost) {
  return [
    `<p>${html(post.description)}</p>`,
    `<h2>Key takeaways</h2><ul>${post.takeaways.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`,
    ...post.sections.map(
      (section) => `<h2>${html(section.heading)}</h2>${section.paragraphs.map((p) => `<p>${inline(p)}</p>`).join("")}`,
    ),
    post.faqs.length
      ? `<h2>Questions people are asking</h2>${post.faqs
          .map((faq) => `<h3>${html(faq.question)}</h3><p>${html(plainText(faq.answer))}</p>`)
          .join("")}`
      : "",
    `<p><a href="${postUrl(post)}">Read the full roundup with every release this week</a></p>`,
  ].join("");
}

export function GET() {
  const posts = blogPosts();
  const items = posts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${postUrl(post)}</link>
      <guid isPermaLink="true">${postUrl(post)}</guid>
      <pubDate>${new Date(`${post.published}T13:00:00Z`).toUTCString()}</pubDate>
      <description>${xml(post.description)}</description>
      <content:encoded><![CDATA[${content(post).replaceAll("]]>", "]]&gt;")}]]></content:encoded>
    </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(BLOG_NAME)}</title>
    <link>https://whichai.today/blog</link>
    <atom:link href="https://whichai.today/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Every week's new AI models, updates, and ranking changes in one sourced roundup.</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${posts[0]?.updated ?? "2026-11-16"}T13:00:00Z`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
