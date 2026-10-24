import raw from "./held.json";

export type HeldFact = {
  kind: string;
  provider?: string;
  model?: string;
  path?: string;
  reason: string;
};

export const held = raw as { pages: string[]; facts: HeldFact[] };
