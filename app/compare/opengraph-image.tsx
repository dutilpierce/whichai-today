import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Compare AI models side by side";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Compare AI models side by side", "Who ranks ahead for each job, what it costs, and what it does with your chats.");
}
