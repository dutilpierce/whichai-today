import { KIND_LABEL, lastChecked, releaseEntries } from "@/lib/releases";

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const entries = releaseEntries();
  const items = entries.slice(0, 50).map((entry) => {
    const link = `https://whichai.today/releases#${entry.id}`;
    const pubDate = new Date(`${entry.date}T12:00:00Z`).toUTCString();
    const description = `${entry.summary} ${entry.features.join(", ")}. Source: ${entry.source_url}`;
    return `    <item>
      <title>${xml(`${entry.provider} ${entry.name} (${KIND_LABEL[entry.kind]})`)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="false">${xml(entry.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xml(description)}</description>
    </item>`;
  });
  const built = lastChecked() ?? entries[0]?.date;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>WhichAI.today latest AI releases</title>
    <link>https://whichai.today/releases</link>
    <description>New AI models and major AI features, newest first.</description>
${built ? `    <lastBuildDate>${new Date(built.length === 10 ? `${built}T12:00:00Z` : built).toUTCString()}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
