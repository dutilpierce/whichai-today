import { categoryBySlug, categoryHeading } from "@/lib/picks";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

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
  const title = found ? categoryHeading(slug) : "WhichAI.today";
  const subtitle = found
    ? `Today's #1: ${found.category.leader.name}`
    : "Find the best AI model for the job.";
  return ogImage(title, subtitle);
}
