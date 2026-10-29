import { pairBySlug, verdictLine } from "@/lib/compare";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today comparison";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const record = pairBySlug(pair);
  return ogImage(
    record ? `${record.a.name} vs ${record.b.name}` : "WhichAI.today",
    record ? verdictLine(record) : "Find the best AI model for the job.",
  );
}
