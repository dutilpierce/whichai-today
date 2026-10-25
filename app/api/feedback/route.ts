import { allow, incr, pushNote, storageEnabled } from "@/lib/store";

function clip(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

export async function POST(request: Request) {
  if (!storageEnabled()) return Response.json({ enabled: false });
  if (!(await allow(request, "feedback", 10, 60))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const vote = body?.vote === "up" || body?.vote === "down" ? body.vote : "";
  const category = clip(body?.category);
  if (!vote || !category) return Response.json({ error: "Vote is required" }, { status: 400 });

  await incr(`feedback:${vote}`);
  if (vote === "down") {
    await pushNote(
      "feedback:notes",
      JSON.stringify({
        category,
        query: clip(body?.query),
        comment: clip(body?.comment),
        at: new Date().toISOString(),
      }),
    );
  }
  return new Response(null, { status: 204 });
}
