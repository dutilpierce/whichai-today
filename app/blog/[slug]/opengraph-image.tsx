import { postBySlug, weekLabel, weekRange } from "@/lib/blog";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today weekly AI roundup";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  return ogImage(
    post ? post.title : "AI news this week",
    post ? `${weekLabel(post.week)} · ${weekRange(post)}` : "The weekly roundup",
  );
}
