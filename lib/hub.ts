import { appList, appsOffering, planPrice, type AppPlan, type AppRecord } from "./apps";
import { freeAndPaid, OPTION_APPS } from "./options";
import { categoryEntries } from "./picks";

export type Job = ReturnType<typeof categoryEntries>[number][1];
export type Mark = 1 | 2 | null;
export type Offer = { app: AppRecord; plan: AppPlan; price: number };

const CHAT = new Set<string>(OPTION_APPS.map((app) => app.slug));
const BUDGET = 20;

function price(plan: AppPlan | undefined) {
  return typeof plan?.price_usd_month === "number" ? plan.price_usd_month : null;
}

/** "Pro" on Claude reads "Claude Pro"; "Copilot Pro" on GitHub Copilot reads "GitHub Copilot Pro". */
export function planName(app: AppRecord, plan: AppPlan) {
  const last = app.name.split(" ").at(-1) ?? app.name;
  if (plan.name.startsWith(last)) return `${app.name}${plan.name.slice(last.length)}`;
  if (plan.name.includes(" ")) return plan.name;
  return `${app.name} ${plan.name}`;
}

export function priceLabel(value: number) {
  return value === 0 ? "Free" : planPrice(value);
}

function modelPlan(app: AppRecord, modelName: string) {
  const offered = app.models.find((model) => model.name === modelName);
  return offered ? app.plans.find((plan) => plan.name === offered.plan) : undefined;
}

/** A plan includes a model when the model's own plan costs no more than it. */
function includes(app: AppRecord, plan: AppPlan, modelName: string) {
  const needed = price(modelPlan(app, modelName));
  const have = price(plan);
  return needed !== null && have !== null && needed <= have;
}

/** Every stored plan that offers this model, cheapest first, optionally limited to some apps. */
export function offers(modelName: string, keep: (app: AppRecord) => boolean = () => true): Offer[] {
  const found: Offer[] = [];
  for (const app of appsOffering(modelName).filter(keep)) {
    const plan = modelPlan(app, modelName);
    const cost = price(plan);
    if (plan && cost !== null) found.push({ app, plan, price: cost });
  }
  return found.sort((a, b) => a.price - b.price);
}

export function cheapestOffer(modelName: string, keep?: (app: AppRecord) => boolean): Offer | null {
  return offers(modelName, keep)[0] ?? null;
}

/** Where to use a job's leader: the cheapest chat app first, then any app, else the stored text. */
export function useItIn(job: Job) {
  const offer =
    cheapestOffer(job.leader.name, (app) => CHAT.has(app.slug)) ?? cheapestOffer(job.leader.name);
  return { offer, text: offer ? null : job.leader.where_to_get };
}

export type CoverageRow = {
  app: AppRecord;
  plan: AppPlan;
  marks: Mark[];
  firsts: number;
  seconds: number;
  chat: boolean;
  upgrade: { plan: AppPlan; firsts: number } | null;
};

function count(marks: Mark[], value: Mark) {
  return marks.filter((mark) => mark === value).length;
}

function better(a: Mark[], b: Mark[]) {
  return count(a, 1) > count(b, 1) || (count(a, 1) === count(b, 1) && count(a, 2) > count(b, 2));
}

/** For each app, the plan at or under $20 that holds the most #1 models, and what it covers. */
export function coverage() {
  const jobs = categoryEntries().map(([, job]) => job);
  const rows: CoverageRow[] = [];
  for (const app of appList()) {
    const paid = app.plans
      .filter((plan) => (price(plan) ?? 0) > 0)
      .sort((a, b) => (price(a) ?? 0) - (price(b) ?? 0));
    if (!paid.length) continue;
    const marksAt = (plan: AppPlan): Mark[] =>
      jobs.map((job) =>
        includes(app, plan, job.leader.name) ? 1 : includes(app, plan, job.runner_up.name) ? 2 : null,
      );
    const inBudget = paid.filter((plan) => (price(plan) ?? 0) <= BUDGET);
    let plan = (inBudget.length ? inBudget : paid)[0];
    let marks = marksAt(plan);
    for (const option of inBudget) {
      const next = marksAt(option);
      if (better(next, marks)) [plan, marks] = [option, next];
    }
    if (!marks.some(Boolean)) continue;
    let upgrade: CoverageRow["upgrade"] = null;
    for (const option of paid.filter((item) => (price(item) ?? 0) > (price(plan) ?? 0))) {
      const firsts = count(marksAt(option), 1);
      if (firsts > (upgrade?.firsts ?? count(marks, 1))) upgrade = { plan: option, firsts };
    }
    rows.push({
      app,
      plan,
      marks,
      firsts: count(marks, 1),
      seconds: count(marks, 2),
      chat: CHAT.has(app.slug),
      upgrade,
    });
  }
  rows.sort((a, b) => b.firsts - a.firsts || b.seconds - a.seconds || (price(a.plan) ?? 0) - (price(b.plan) ?? 0));
  const shown = jobs.map((_, index) => rows.some((row) => row.marks[index]));
  return {
    jobs: jobs.filter((_, index) => shown[index]),
    missing: jobs.filter((_, index) => !shown[index]),
    rows: rows.map((row) => ({ ...row, marks: row.marks.filter((_, index) => shown[index]) })),
  };
}

/** The four quick answers at the top of the page, plus one sentence that sums them up. */
export function shortAnswer() {
  const jobs = categoryEntries().map(([, job]) => job);
  const { rows } = coverage();
  const best = rows.find((row) => row.chat) ?? null;
  const leads = best
    ? jobs.filter((job) => includes(best.app, best.plan, job.leader.name))
    : [];

  const freeJobs = jobs.filter((job) => freeAndPaid(job).free);
  const general = jobs.find((job) => job.slug === "general");
  const everyday = general ? freeAndPaid(general) : null;

  const coding = jobs.find((job) => job.slug === "coding") ?? null;
  const editors = coding ? offers(coding.leader.name, (app) => Boolean(app.capabilities?.code_editing)) : [];

  const open = new Map<string, Job[]>();
  for (const job of jobs) open.set(job.open_source_pick.name, [...(open.get(job.open_source_pick.name) ?? []), job]);

  const total = jobs.length;
  const verdict = [
    best
      ? `Pay for one app? ${planName(best.app, best.plan)} (${priceLabel(price(best.plan) ?? 0)}) has today's #1 model in ${best.firsts} of ${total} jobs.`
      : "",
    `Pay nothing? ${freeJobs.length} of ${total} jobs have a free pick.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    verdict,
    total,
    best: best ? { ...best, leads } : null,
    free: {
      count: freeJobs.length,
      everyday: everyday?.free ?? null,
      everydayApp: everyday?.freeApp ?? null,
    },
    coding: coding ? { job: coding, offer: editors[0] ?? null, also: editors.slice(1, 4) } : null,
    open: [...open.entries()].map(([name, covers]) => ({ name, jobs: covers })),
  };
}
