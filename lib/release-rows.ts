import { currentModels } from "./catalog";
import { modelSlug } from "./picks";
import { releaseEntries } from "./releases";
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
