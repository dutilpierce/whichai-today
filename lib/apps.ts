import appsFile from "./apps.json";

export type AppPlan = {
  name: string;
  price_usd_month: number | null;
  free_tier: string;
  source_url: string;
};

export type AppModel = { name: string; plan: string };

export type AppRecord = {
  slug: string;
  name: string;
  maker: string;
  link: string;
  models: AppModel[];
  plans: AppPlan[];
  skill: string;
  privacy: { trains_by_default: string; opt_out: string; source_url: string };
  capabilities: Record<string, boolean>;
  checked: string;
};

export function appList(): AppRecord[] {
  return (appsFile.apps ?? []) as AppRecord[];
}

export function appsOffering(modelName: string) {
  return appList().filter((app) => app.models.some((model) => model.name === modelName));
}

export function appsWithCapability(capability: string) {
  return appList().filter((app) => app.capabilities?.[capability]);
}

export function planPrice(price: number | null) {
  if (price === 0) return "Free";
  if (typeof price === "number") return `$${price}/month`;
  return "Price on the plan page";
}

export function offerFor(app: AppRecord, modelName: string) {
  const offered = app.models.find((model) => model.name === modelName);
  const plan = app.plans.find((item) => item.name === offered?.plan) ?? app.plans[0];
  const free = app.plans.some((item) => item.price_usd_month === 0);
  return { offered, plan, free };
}
