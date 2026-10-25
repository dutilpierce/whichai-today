import { UNRANKED_INTENTS } from "@/lib/intents";
import { incr } from "@/lib/store";

const COUNTED = new Set<string>(UNRANKED_INTENTS);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intent = typeof body?.intent === "string" ? body.intent : "";
  if (!COUNTED.has(intent)) {
    return Response.json({ error: "Unknown event" }, { status: 400 });
  }

  await incr(`notranked:${intent}`);

  return new Response(null, { status: 204 });
}
