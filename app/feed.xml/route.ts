import models from "@/lib/models.json";
import history from "@/lib/history.json";
import { categoryEntries, changeTitle } from "@/lib/picks";

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const byKey = Object.fromEntries(categoryEntries());
  const items = [...history.entries].reverse().map((entry) => {
    const category = byKey[entry.category];
    const slug = category?.slug ?? entry.category;
    const title = category ? changeTitle(entry, slug) : entry.leader;
    const link = `https://whichai.today/${slug}`;
    const pubDate = new Date(`${entry.date}T12:00:00Z`).toUTCString();
    return `    <item>
      <title>${xml(title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="false">${xml(`${slug}-${entry.date}-${entry.leader}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xml(entry.evidence)}</description>
    </item>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>WhichAI.today leader changes</title>
    <link>https://whichai.today</link>
    <description>When a category's number one changes on WhichAI.today.</description>
    <lastBuildDate>${new Date(models.last_updated).toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
