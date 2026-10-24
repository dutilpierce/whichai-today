import { changeById } from "@/lib/catalog";
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
    change ? `${change.leader} overtook ${change.previous}` : "WhichAI.today",
    change ? change.category.display_name : "Leader changes",
  );
}
