import { compareByPair } from "@/lib/catalog";
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
  const found = compareByPair(pair);
  return ogImage(
    found ? `${found.leader.name} vs ${found.runner.name}` : "WhichAI.today",
    found ? `Today's #1 and the alternative` : "Find the best AI model for the job.",
  );
}
