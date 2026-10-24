import { readFile } from "node:fs/promises";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_OWNER_CHAT_ID;
const text = process.argv.slice(2).join(" ") || "WhichAI held something back. Check the Actions log.";

if (!token || !chat) {
  console.log("No owner Telegram chat is configured.");
  process.exit(0);
}

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chat, text }),
});

if (!res.ok) {
  console.error(`Owner notice failed: ${res.status}`);
  process.exit(0);
}

console.log("Owner notified.");
