import { picksDocument, toCsv } from "@/lib/open-data";

export function GET() {
  return new Response(toCsv(picksDocument().rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
}
