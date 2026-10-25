import { UNRANKED_INTENTS } from "@/lib/intents";
import { allow, incr } from "@/lib/store";

const INTENTS = new Set<string>(UNRANKED_INTENTS);
const TYPES = new Set(["result", "copy", "open"]);

export async function POST(request: Request) {
  if (!(await allow(request, "event", 60, 60))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const type = typeof body?.type === "string" ? body.type : "";
  const intent = typeof body?.intent === "string" ? body.intent : "";
  const category = typeof body?.category === "string" ? body.category.slice(0, 40) : "";

  if (type === "notranked" || (!type && intent)) {
    if (!INTENTS.has(intent)) return Response.json({ error: "Unknown event" }, { status: 400 });
    await incr(`notranked:${intent}`);
    return new Response(null, { status: 204 });
  }

  if (!TYPES.has(type) || !/^[a-z0-9_-]+$/.test(category)) {
    return Response.json({ error: "Unknown event" }, { status: 400 });
  }
  await incr(type === "result" ? "events:results" : `events:${type}:${category}`);
  return new Response(null, { status: 204 });
}
