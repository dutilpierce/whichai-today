import { historyDocument } from "@/lib/open-data";

export function GET() {
  return Response.json(historyDocument());
}
