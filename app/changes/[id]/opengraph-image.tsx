import { changeById } from "@/lib/catalog";
import { changeTitle } from "@/lib/picks";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today leader change";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const change = changeById(id);
  return ogImage(
    change ? changeTitle(change, change.slug) : "WhichAI.today",
    change ? change.category.display_name : "Leader changes",
  );
}
