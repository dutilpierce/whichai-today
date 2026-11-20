// Tells the owner a scheduled job held something back.
// Telegram when TELEGRAM_BOT_TOKEN + TELEGRAM_OWNER_CHAT_ID are set; otherwise a GitHub issue
// (GitHub emails the repo owner), reusing one open "Automation alert" issue so failures don't pile up.
const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_OWNER_CHAT_ID;
const text = process.argv.slice(2).join(" ") || "WhichAI held something back. Check the Actions log.";
const runUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
const message = runUrl ? `${text}\n${runUrl}` : text;

async function telegram() {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: message }),
  });
  if (!res.ok) throw new Error(`Telegram returned ${res.status}`);
}

const TITLE = "Automation alert: a scheduled job needs attention";

async function github() {
  const repo = process.env.GITHUB_REPOSITORY;
  const ghToken = process.env.GITHUB_TOKEN;
  if (!repo || !ghToken) throw new Error("no GitHub token");
  const api = (path, init = {}) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  const body = `${message}\n\n_Workflow: ${process.env.GITHUB_WORKFLOW ?? "unknown"}_`;
  const open = await api(`/issues?state=open&labels=automation-alert&per_page=1`);
  const [existing] = open.ok ? await open.json() : [];
  const res = existing
    ? await api(`/issues/${existing.number}/comments`, { method: "POST", body: JSON.stringify({ body }) })
    : await api(`/issues`, { method: "POST", body: JSON.stringify({ title: TITLE, body, labels: ["automation-alert"] }) });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
}

try {
  if (token && chat) await telegram();
  else await github();
  console.log("Owner notified.");
} catch (error) {
  // An alert that fails to send must never fail the job a second time.
  console.error(`Owner notice failed: ${error.message}`);
}
