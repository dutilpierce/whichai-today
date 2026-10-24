import type { Metadata } from "next";
import { EmbedBadge } from "@/components/EmbedBadge";
import models from "@/lib/models.json";
import { shortLabel } from "@/lib/picks";

export const metadata: Metadata = {
  title: "Embed a pick",
  description: "Add today's WhichAI.today pick to your site. The badge updates when the leader changes.",
  alternates: { canonical: "/embed" },
  openGraph: {
    title: "Embed a pick",
    description: "A badge or a text link for today's best AI in each job.",
    url: "https://whichai.today/embed",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function EmbedPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Put this on your site</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Each badge links back to the category page and updates when that leader changes. Use the text link where images are blocked.
        </p>
        {Object.values(models.categories).map((category) => {
          const job = shortLabel(category.slug).toLowerCase();
          const href = `https://whichai.today/${category.slug}`;
          const alt = `Today's best ${job} AI: ${category.leader.name}, via WhichAI.today`;
          const html = `<a href="${href}"><img src="https://whichai.today/badge/${category.slug}" alt="${alt}" width="320" height="40"></a>`;
          const text = `<a href="${href}">Today's best ${job} AI: ${category.leader.name}, via WhichAI.today</a>`;
          return (
            <EmbedBadge
              key={category.slug}
              id={category.slug}
              heading={category.display_name}
              html={html}
              text={text}
              src={`/badge/${category.slug}`}
              alt={alt}
              href={href}
            />
          );
        })}
      </main>
    </div>
  );
}
