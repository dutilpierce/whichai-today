import models from "@/lib/models.json";
import { categoryBySlug, shortLabel } from "@/lib/picks";

export function generateStaticParams() {
  return Object.values(models.categories).map((category) => ({
    category: category.slug,
  }));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const found = categoryBySlug(category);
  if (!found) return new Response("Not found", { status: 404 });

  const job = shortLabel(found.category.slug).toLowerCase();
  const label = `Today's best ${job} AI: ${found.category.leader.name} · WhichAI.today`;
  const width = Math.ceil(label.length * 8) + 36;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40" viewBox="0 0 ${width} 40" role="img" aria-label="${escapeXml(label)}">
  <rect width="${width}" height="40" rx="8" fill="#09090b"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="39" rx="7.5" fill="none" stroke="#3f3f46"/>
  <text x="16" y="25" fill="#fafafa" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14">${escapeXml(label)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
