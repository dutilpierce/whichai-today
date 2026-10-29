import { formatDay } from "@/lib/picks";
import { releaseById } from "@/lib/releases";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today release";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = releaseById(id);
  return ogImage(
    release ? release.name : "Latest AI releases",
    release ? `${release.provider}, released ${formatDay(release.date)}` : "New AI models and features, newest first.",
  );
}
