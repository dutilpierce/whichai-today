// Keeps the scheduled data jobs current without anyone watching.
// GitHub delays and sometimes drops scheduled runs, and a run can fail when an AI provider is
// down. Every hour this checks when each job last succeeded. If one is overdue and no data job is
// running or queued, it starts the most overdue one (only one at a time: the jobs share one
// concurrency group, and a second pending run would cancel the first). A job still overdue past
// its alert limit opens or updates the "Automation alert" issue, once a day.
// No AI calls and no packages: Node's fetch and the GitHub token only.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const HOUR = 3600_000;

// okHours: overdue after this long without a success. alertHours: tell the owner.
export const JOBS = [
  { file: "refresh-releases.yml", okHours: 18, alertHours: 48 },
  { file: "refresh-rankings.yml", okHours: 8 * 24, alertHours: 10 * 24 },
  { file: "weekly-blog.yml", okHours: 8 * 24, alertHours: 10 * 24 },
  { file: "weekly-audit.yml", okHours: 8 * 24, alertHours: 10 * 24 },
  { file: "refresh-apps.yml", okHours: 32 * 24, alertHours: 38 * 24 },
  { file: "monthly-verify.yml", okHours: 32 * 24, alertHours: 38 * 24 },
];

/**
 * lastSuccess: { [file]: ISO time or null }. busy: a data job is running or queued.
 * Returns the one job to start (or null) and the alert lines.
 */
export function decide(now, lastSuccess, busy, jobs = JOBS) {
  const overdue = [];
  const alerts = [];
  for (const job of jobs) {
    const last = lastSuccess[job.file];
    const ageHours = last ? (now - new Date(last).getTime()) / HOUR : Infinity;
    if (ageHours > job.okHours) overdue.push({ ...job, ratio: ageHours / job.okHours });
    if (ageHours > job.alertHours) {
      const since = last ? `last succeeded ${last.slice(0, 16).replace("T", " ")} UTC` : "has never succeeded";
      alerts.push(`${job.file} ${since}`);
    }
  }
  overdue.sort((a, b) => b.ratio - a.ratio);
  return { start: busy ? null : (overdue[0]?.file ?? null), overdue: overdue.map((job) => job.file), alerts };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  const now = new Date("2026-11-26T12:00:00Z").getTime();
  const fresh = {
    "refresh-releases.yml": "2026-11-26T06:00:00Z",
    "refresh-rankings.yml": "2026-11-23T11:00:00Z",
    "weekly-blog.yml": "2026-11-23T13:00:00Z",
    "weekly-audit.yml": "2026-11-23T12:00:00Z",
    "refresh-apps.yml": "2026-11-01T11:00:00Z",
    "monthly-verify.yml": "2026-11-01T12:00:00Z",
  };
  assert(decide(now, fresh, false).start === null, "nothing starts when every job is current");

  const lateReleases = { ...fresh, "refresh-releases.yml": "2026-11-25T08:00:00Z" };
  assert(decide(now, lateReleases, false).start === "refresh-releases.yml", "an overdue releases job is started");
  assert(decide(now, lateReleases, true).start === null, "nothing starts while a data job is running or queued");
  assert(decide(now, lateReleases, false).alerts.length === 0, "a few hours late does not alert");

  const both = { ...lateReleases, "refresh-rankings.yml": "2026-11-10T11:00:00Z" };
  const picked = decide(now, both, false);
  assert(picked.start === "refresh-rankings.yml", "the most overdue job goes first");
  assert(picked.overdue.length === 2, "both overdue jobs are reported");
  assert(picked.alerts.some((line) => line.startsWith("refresh-rankings.yml")), "16 days without rankings alerts");

  const never = decide(now, { ...fresh, "weekly-blog.yml": null }, false);
  assert(never.start === "weekly-blog.yml" && never.alerts[0].includes("never"), "a job that never succeeded is started and reported");
  console.log("watchdog self-check ok");
}

async function github(path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path} returned ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function main() {
  const site = JSON.parse(await readFile(new URL("../lib/site.json", import.meta.url), "utf8"));
  if (!site.auto_publish) {
    console.log("Publishing is paused; the watchdog does nothing.");
    return;
  }

  const lastSuccess = {};
  for (const job of JOBS) {
    const data = await github(`/actions/workflows/${job.file}/runs?status=success&per_page=1`);
    lastSuccess[job.file] = data.workflow_runs?.[0]?.created_at ?? null;
  }
  const files = new Set(JOBS.map((job) => job.file));
  let busy = false;
  for (const status of ["in_progress", "queued", "waiting", "pending"]) {
    const data = await github(`/actions/runs?status=${status}&per_page=50`);
    if ((data.workflow_runs ?? []).some((run) => files.has(run.path?.split("/").pop()))) busy = true;
  }

  const now = Date.now();
  const { start, overdue, alerts } = decide(now, lastSuccess, busy);
  for (const job of JOBS) console.log(`${job.file}: last success ${lastSuccess[job.file] ?? "never"}`);
  if (!overdue.length) console.log("Every job is current.");
  else if (busy) console.log(`Overdue (${overdue.join(", ")}), but a data job is running; checking again next hour.`);

  if (start) {
    await github(`/actions/workflows/${start}/dispatches`, { method: "POST", body: JSON.stringify({ ref: "main" }) });
    console.log(`Started ${start}.`);
  }

  // One alert a day at most, so an outage does not post every hour.
  if (alerts.length && new Date(now).getUTCHours() === 13) {
    const text = `Some data jobs are behind and the watchdog could not catch them up:\n- ${alerts.join("\n- ")}`;
    spawnSync(process.execPath, [fileURLToPath(new URL("./notify-owner.mjs", import.meta.url)), text], { stdio: "inherit" });
  }
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/watchdog.mjs")) {
  await main();
}
