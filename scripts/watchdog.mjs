// Keeps the scheduled data jobs current without anyone watching.
// GitHub delays and sometimes drops scheduled runs, and a run can fail when an AI provider is
// down. Every hour this checks when each job last succeeded. If one is overdue and no data job is
// running or queued, it starts the most overdue one (only one at a time: the jobs share one
// concurrency group, and a second pending run would cancel the first).
// Cost guard: a job is not restarted within its cooldown of its last attempt, and after
// MAX_FAILURES failed runs in a row it is left alone (a fix or a successful scheduled run resets
// it), so a job that fails for a real reason cannot spend AI calls every hour.
// Jobs past their alert limit, or given up on, open or update the "Automation alert" issue,
// once a day. No AI calls and no packages: Node's fetch and the GitHub token only.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const HOUR = 3600_000;
export const MAX_FAILURES = 3;

// okHours: overdue after this long without a success. cooldownHours: minimum gap between
// attempts. alertHours: tell the owner.
export const JOBS = [
  { file: "refresh-releases.yml", okHours: 18, cooldownHours: 6, alertHours: 48 },
  { file: "refresh-rankings.yml", okHours: 8 * 24, cooldownHours: 12, alertHours: 10 * 24 },
  { file: "weekly-blog.yml", okHours: 8 * 24, cooldownHours: 12, alertHours: 10 * 24 },
  { file: "weekly-audit.yml", okHours: 8 * 24, cooldownHours: 12, alertHours: 10 * 24 },
  { file: "refresh-apps.yml", okHours: 32 * 24, cooldownHours: 24, alertHours: 38 * 24 },
  { file: "monthly-verify.yml", okHours: 32 * 24, cooldownHours: 24, alertHours: 38 * 24 },
];

const hoursSince = (now, iso) => (iso ? (now - new Date(iso).getTime()) / HOUR : Infinity);

/**
 * state: { [file]: { lastSuccess, lastAttempt, failures } }, where failures counts failed runs
 * since the last success. busy: a data job is running or queued.
 * Returns the one job to start (or null), the overdue jobs, and the alert lines.
 */
export function decide(now, state, busy, jobs = JOBS) {
  const candidates = [];
  const overdue = [];
  const alerts = [];
  for (const job of jobs) {
    const { lastSuccess = null, lastAttempt = null, failures = 0 } = state[job.file] ?? {};
    const age = hoursSince(now, lastSuccess);
    if (age <= job.okHours) continue;
    overdue.push(job.file);
    const since = lastSuccess ? `last succeeded ${lastSuccess.slice(0, 16).replace("T", " ")} UTC` : "has never succeeded";
    if (failures >= MAX_FAILURES) {
      alerts.push(`${job.file} ${since} and failed ${failures} runs in a row; not retrying until it is fixed or a scheduled run succeeds`);
      continue;
    }
    if (age > job.alertHours) alerts.push(`${job.file} ${since}`);
    if (hoursSince(now, lastAttempt) < job.cooldownHours) continue;
    candidates.push({ file: job.file, ratio: age / job.okHours });
  }
  candidates.sort((a, b) => b.ratio - a.ratio);
  return { start: busy ? null : (candidates[0]?.file ?? null), overdue, alerts };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  const now = new Date("2026-11-26T12:00:00Z").getTime();
  const ok = (lastSuccess) => ({ lastSuccess, lastAttempt: lastSuccess, failures: 0 });
  const fresh = {
    "refresh-releases.yml": ok("2026-11-26T06:00:00Z"),
    "refresh-rankings.yml": ok("2026-11-23T11:00:00Z"),
    "weekly-blog.yml": ok("2026-11-23T13:00:00Z"),
    "weekly-audit.yml": ok("2026-11-23T12:00:00Z"),
    "refresh-apps.yml": ok("2026-11-01T11:00:00Z"),
    "monthly-verify.yml": ok("2026-11-01T12:00:00Z"),
  };
  assert(decide(now, fresh, false).start === null, "nothing starts when every job is current");

  const lateReleases = { ...fresh, "refresh-releases.yml": ok("2026-11-25T08:00:00Z") };
  assert(decide(now, lateReleases, false).start === "refresh-releases.yml", "an overdue releases job is started");
  assert(decide(now, lateReleases, true).start === null, "nothing starts while a data job is running or queued");
  assert(decide(now, lateReleases, false).alerts.length === 0, "a few hours late does not alert");

  const justTried = {
    ...fresh,
    "refresh-releases.yml": { lastSuccess: "2026-11-25T08:00:00Z", lastAttempt: "2026-11-26T09:00:00Z", failures: 1 },
  };
  assert(decide(now, justTried, false).start === null, "a job is not restarted within its cooldown");

  const gaveUp = {
    ...fresh,
    "weekly-blog.yml": { lastSuccess: "2026-11-16T13:00:00Z", lastAttempt: "2026-11-25T13:00:00Z", failures: 3 },
  };
  const stuck = decide(now, gaveUp, false);
  assert(stuck.start === null, "a job that failed three runs in a row is not restarted");
  assert(stuck.alerts.some((line) => line.includes("failed 3 runs")), "giving up is reported");

  const both = { ...lateReleases, "refresh-rankings.yml": ok("2026-11-10T11:00:00Z") };
  const picked = decide(now, both, false);
  assert(picked.start === "refresh-rankings.yml", "the most overdue job goes first");
  assert(picked.overdue.length === 2, "both overdue jobs are reported");
  assert(picked.alerts.some((line) => line.startsWith("refresh-rankings.yml")), "16 days without rankings alerts");

  const never = decide(now, { ...fresh, "weekly-blog.yml": { lastSuccess: null, lastAttempt: null, failures: 0 } }, false);
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

async function jobState(file) {
  const success = await github(`/actions/workflows/${file}/runs?status=success&per_page=1`);
  const lastSuccess = success.workflow_runs?.[0]?.created_at ?? null;
  const recent = (await github(`/actions/workflows/${file}/runs?per_page=20`)).workflow_runs ?? [];
  const sinceSuccess = recent.filter((run) => !lastSuccess || run.created_at > lastSuccess);
  return {
    lastSuccess,
    lastAttempt: recent[0]?.created_at ?? null,
    failures: sinceSuccess.filter((run) => run.conclusion === "failure" || run.conclusion === "timed_out").length,
  };
}

async function main() {
  const site = JSON.parse(await readFile(new URL("../lib/site.json", import.meta.url), "utf8"));
  if (!site.auto_publish) {
    console.log("Publishing is paused; the watchdog does nothing.");
    return;
  }

  const state = {};
  for (const job of JOBS) state[job.file] = await jobState(job.file);
  const files = new Set(JOBS.map((job) => job.file));
  let busy = false;
  for (const status of ["in_progress", "queued", "waiting", "pending"]) {
    const data = await github(`/actions/runs?status=${status}&per_page=50`);
    if ((data.workflow_runs ?? []).some((run) => files.has(run.path?.split("/").pop()))) busy = true;
  }

  const now = Date.now();
  const { start, overdue, alerts } = decide(now, state, busy);
  for (const job of JOBS) {
    const { lastSuccess, failures } = state[job.file];
    console.log(`${job.file}: last success ${lastSuccess ?? "never"}${failures ? `, ${failures} failed since` : ""}`);
  }
  if (!overdue.length) console.log("Every job is current.");
  else if (busy) console.log(`Overdue (${overdue.join(", ")}), but a data job is running; checking again next hour.`);
  else if (!start) console.log(`Overdue (${overdue.join(", ")}), but each is in its cooldown or was given up on.`);

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
