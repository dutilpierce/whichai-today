import { historyDocument, toCsv } from "@/lib/open-data";

export function GET() {
  return new Response(toCsv(historyDocument().rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
}
