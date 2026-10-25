const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_OWNER_CHAT_ID;

async function redis(command) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`storage returned ${res.status}`);
  const data = await res.json();
  return data.result;
}

function linesOf(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    try {
      const note = JSON.parse(item);
      return `${note.kind ?? note.category ?? "note"}: ${(note.comment || note.text || note.query || "").slice(0, 180)}`;
    } catch {
      return String(item).slice(0, 180);
    }
  });
}

async function main() {
  if (!url || !token) {
    console.log("feedback: storage is not configured");
    return;
  }
  const up = Number(await redis(["GET", "feedback:up"])) || 0;
  const down = Number(await redis(["GET", "feedback:down"])) || 0;
  const notes = linesOf(await redis(["LRANGE", "feedback:notes", "0", "9"]));
  const suggestions = linesOf(await redis(["LRANGE", "suggestions", "0", "9"]));
  const results = Number(await redis(["GET", "events:results"])) || 0;
  const text = [
    `WhichAI feedback: ${up} yes, ${down} no, ${results} recommendations.`,
    notes.length ? `Latest no votes:\n${notes.join("\n")}` : "No written votes.",
    suggestions.length ? `Latest suggestions:\n${suggestions.join("\n")}` : "No suggestions.",
  ].join("\n\n");
  console.log(text);
  if (!telegramToken || !chat) {
    console.log("feedback: no owner chat configured");
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3500) }),
  });
  if (!res.ok) console.warn(`feedback: telegram returned ${res.status}`);
}

main().catch((error) => {
  console.warn(error instanceof Error ? error.message : error);
});
