import { currentModels } from "./catalog";
import { modelSlug } from "./picks";
import { releaseEntries, type Release } from "./releases";
import type { ReleaseRowData } from "@/components/ReleaseRow";

// Rows for the page, without the evidence quote, and linked to a model page when we rank that model.
export function releaseRows(limit?: number): ReleaseRowData[] {
  const ranked = new Set(currentModels().map((model) => model.slug));
  return releaseEntries()
    .slice(0, limit)
    .map((entry) => {
      const { evidence: _evidence, ...rest } = entry;
      void _evidence;
      const slug = modelSlug(entry.name);
      return { ...rest, ranked: ranked.has(slug) ? slug : null };
    });
}

// Model launches get their own search listing, since people search for their release dates. Feature launches stay
// off search unless we rank the model, because their page is a near copy of the timeline row.
export function releaseIndexed(entry: Pick<Release, "name" | "kind">) {
  if (entry.kind !== "feature") return true;
  const slug = modelSlug(entry.name);
  return currentModels().some((model) => model.slug === slug);
}
