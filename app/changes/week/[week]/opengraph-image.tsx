import { weekById } from "@/lib/catalog";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today weekly leader changes";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const found = weekById(week);
  return ogImage(
    found ? `Leader changes, ${found.week}` : "WhichAI.today",
    found ? `${found.changes.length} confirmed change${found.changes.length === 1 ? "" : "s"}` : "Leader changes",
  );
}
