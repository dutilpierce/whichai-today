import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

// The morning run always researches. The evening run only researches when today's rankings were not published.
export function rankingDue({ updated, today, hour, event }) {
  const manual = event === "workflow_dispatch";
  const evening = !manual && hour >= 18;
  if (!evening) return true;
  return String(updated ?? "").slice(0, 10) < today;
}

function selfCheck() {
  const today = "2026-11-02";
  const yesterday = "2026-11-01";
  if (!rankingDue({ updated: yesterday, today, hour: 11, event: "schedule" })) throw new Error("the morning run should research");
  if (!rankingDue({ updated: today, today, hour: 11, event: "schedule" })) throw new Error("the morning run should still recheck");
  if (rankingDue({ updated: today, today, hour: 23, event: "schedule" })) throw new Error("the evening run should skip a published day");
  if (!rankingDue({ updated: yesterday, today, hour: 23, event: "schedule" })) throw new Error("the evening run should catch a missed day");
  if (!rankingDue({ updated: yesterday, today, hour: 20, event: "schedule" })) throw new Error("a late run should still catch a missed day");
  if (!rankingDue({ updated: today, today, hour: 23, event: "workflow_dispatch" })) throw new Error("a manual run should always research");
  console.log("ranking-due self-check ok");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

if (process.argv[1]?.endsWith("ranking-due.mjs")) {
  const models = JSON.parse(await readFile(new URL("../lib/models.json", import.meta.url), "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  const due = rankingDue({
    updated: models.last_updated,
    today,
    hour: new Date().getUTCHours(),
    event: process.env.GITHUB_EVENT_NAME ?? "schedule",
  });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${due ? "true" : "false"}\n`);
  const published = String(models.last_updated ?? "").slice(0, 10);
  console.log(due ? `Rankings are due. Last published ${published}.` : `Rankings already published for ${published}. Skipping the evening check.`);
}
