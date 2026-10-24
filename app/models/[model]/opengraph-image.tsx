import { modelBySlug } from "@/lib/catalog";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today model";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model: slug } = await params;
  const found = modelBySlug(slug);
  const title = found?.name ?? "WhichAI.today";
  const subtitle = found
    ? found.archived
      ? "Not currently a pick"
      : found.roles.map((role) => `${role.display_name}: ${role.role}`).join(" · ")
    : "Find the best AI model for the job.";
  return ogImage(title, subtitle || found?.provider || "");
}
