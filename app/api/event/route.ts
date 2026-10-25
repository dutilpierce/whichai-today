import { UNRANKED_INTENTS } from "@/lib/intents";

const COUNTED = new Set<string>(UNRANKED_INTENTS);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intent = typeof body?.intent === "string" ? body.intent : "";
  if (!COUNTED.has(intent)) {
    return Response.json({ error: "Unknown event" }, { status: 400 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    await fetch(`${url}/incr/notranked:${intent}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  }

  return new Response(null, { status: 204 });
}
