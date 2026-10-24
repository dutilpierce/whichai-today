import { picksDocument } from "@/lib/open-data";

export function GET() {
  return Response.json(picksDocument());
}
