import tasksFile from "@/lib/tasks.json";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "WhichAI.today task";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ task: string }>;
}) {
  const { task: slug } = await params;
  const task = tasksFile.tasks.find((item) => item.slug === slug);
  return ogImage(
    task ? `Best AI for ${task.title} right now` : "WhichAI.today",
    task?.tip ?? "Find the best AI model for the job.",
  );
}
