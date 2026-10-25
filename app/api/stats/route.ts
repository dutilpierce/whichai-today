import { connection } from "next/server";
import { readCount, storageEnabled } from "@/lib/store";

export async function GET() {
  await connection();
  if (!storageEnabled()) return Response.json({ enabled: false, recommendations: 0 });
  const recommendations = await readCount("events:results");
  return Response.json({ enabled: true, recommendations });
}
