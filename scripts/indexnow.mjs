import { readFile } from "node:fs/promises";

const SITE = "https://whichai.today";
const HOST = "whichai.today";

export function urlsToPing(list) {
  return Array.isArray(list) ? list.filter((url) => typeof url === "string" && url.startsWith(SITE)) : [];
}

async function liveHasRun(lastUpdated) {
  const deadline = Date.now() + 6 * 60 * 1000;
  let missing = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SITE}/data/picks.json`, { cache: "no-store" });
      if (res.status === 404) {
        missing += 1;
        if (missing >= 2) return false;
      } else if (res.ok) {
        const body = await res.json();
        if (body.last_updated === lastUpdated) return true;
      }
    } catch {
      // The deploy may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
  return false;
}

async function ping(urls, key) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `${SITE}/${key}.txt`,
      urlList: urls,
    }),
  });
  console.log(`indexnow: ${res.status} for ${urls.length} urls`);
  return res.status;
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function selfCheck() {
  assert(urlsToPing([]).length === 0, "an empty change list sends no ping");
  assert(urlsToPing(null).length === 0, "a missing change list sends no ping");
  assert(urlsToPing(["https://example.com"]).length === 0, "only this site is pinged");
  console.log("indexnow self-check ok");
}

const isIndexNow = process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/indexnow.mjs");

if (isIndexNow && process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

if (isIndexNow) {
  try {
    const site = JSON.parse(await readFile(new URL("../lib/site.json", import.meta.url), "utf8"));
    const models = JSON.parse(await readFile(new URL("../lib/models.json", import.meta.url), "utf8"));
    const urls = urlsToPing(JSON.parse(await readFile(new URL("../indexnow-urls.json", import.meta.url), "utf8")));
    if (!urls.length) {
      console.log("indexnow: no changed URLs");
    } else if (!site.indexnow_key) {
      console.warn("indexnow: no key, skipping");
    } else if (!(await liveHasRun(models.last_updated))) {
      console.warn("indexnow: live data is not ready, skipping");
    } else {
      await ping(urls, site.indexnow_key);
    }
  } catch (error) {
    console.warn(`indexnow: ${error instanceof Error ? error.message : "skipped"}`);
  }
}
