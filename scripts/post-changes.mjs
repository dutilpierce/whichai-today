import { readFile } from "node:fs/promises";

const MODELS = new URL("../lib/models.json", import.meta.url);
const SITE = new URL("../lib/site.json", import.meta.url);

const SHORT = {
  coding: "Coding",
  legal: "Legal",
  writing: "Writing",
  reasoning: "Reasoning",
  speed: "Speed",
  general: "General",
};

function loadChanges() {
  return readFile(new URL("../changes-this-run.json", import.meta.url), "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => []);
}

function postText(change) {
  const category = models.categories[change.category];
  const slug = category?.slug ?? change.category;
  const label = SHORT[slug] ?? slug;
  const title = change.previous
    ? `${label}: ${change.leader} overtook ${change.previous}`
    : `${label}: ${change.leader}`;
  const why = category?.leader?.why ?? change.evidence;
  const url = `https://whichai.today/${slug}`;
  return { text: `${title}\n${why}\n${url}`, url };
}

async function postTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL;
  if (!token || !channel) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channel, text }),
  });
  if (!res.ok) throw new Error(`Telegram returned ${res.status}`);
  return true;
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

async function postBluesky(text, url) {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) return false;

  const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!sessionRes.ok) throw new Error(`Bluesky login returned ${sessionRes.status}`);
  const session = await sessionRes.json();

  const start = text.indexOf(url);
  const facets = start === -1 ? [] : [{
    index: { byteStart: byteLength(text.slice(0, start)), byteEnd: byteLength(text.slice(0, start + url.length)) },
    features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
  }];

  const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        facets,
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!postRes.ok) throw new Error(`Bluesky post returned ${postRes.status}`);
  return true;
}

const site = JSON.parse(await readFile(SITE, "utf8"));
const models = JSON.parse(await readFile(MODELS, "utf8"));
if (!site.auto_publish) {
  console.log("Publishing is paused.");
  process.exit(0);
}

const changes = await loadChanges();
if (!changes.length) {
  console.log("No confirmed leader changes to post.");
  process.exit(0);
}

for (const change of changes) {
  if (change.type !== "change") continue;
  if (!models.categories[change.category]) continue;
  const { text, url } = postText(change);
  const telegram = await postTelegram(text);
  const bluesky = await postBluesky(text, url);
  console.log(`${change.category}: telegram ${telegram ? "posted" : "skipped"}, bluesky ${bluesky ? "posted" : "skipped"}`);
}
