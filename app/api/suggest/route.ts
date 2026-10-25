import { allow, pushNote, storageEnabled } from "@/lib/store";

export async function POST(request: Request) {
  if (!storageEnabled()) return Response.json({ enabled: false });
  if (!(await allow(request, "suggest", 5, 60))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const kind = body?.kind === "model" || body?.kind === "app" || body?.kind === "correction" ? body.kind : "";
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 300) : "";
  if (!kind || !text) return Response.json({ error: "A suggestion is required" }, { status: 400 });
  await pushNote("suggestions", JSON.stringify({ kind, text, at: new Date().toISOString() }));
  return new Response(null, { status: 204 });
}
