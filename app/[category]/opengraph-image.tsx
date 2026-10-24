import models from "@/lib/models.json";
import { categoryOg, ogContentType, ogImage, ogSize } from "@/lib/og";
import { categoryBySlug, categoryHeading, formatDay, leaderBadge } from "@/lib/picks";

export const alt = "WhichAI.today category";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const found = categoryBySlug(slug);
  if (!found) return ogImage("WhichAI.today", "Find the best AI model for the job.");
  const { category } = found;
  const badge = leaderBadge(
    category.leader.sources_agreeing,
    category.leader.sources_checked,
    category.primary_signal,
    category.leader.primary_score,
    category.runner_up.primary_score,
  );
  return categoryOg({
    category: categoryHeading(slug),
    leader: category.leader.name,
    badge,
    others: `Also ${category.runner_up.name} · Open ${category.open_source_pick.name}`,
    updated: `Updated ${formatDay(models.last_updated)}`,
  });
}
