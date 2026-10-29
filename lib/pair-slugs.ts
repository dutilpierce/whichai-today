// Compare URLs, kept free of "@/" imports so next.config.ts can load it for redirects.
import archiveFile from "./archive.json";
import models from "./models.json";

export type Modality = "text" | "image" | "video";

const MEDIA: Record<string, Modality> = { images: "image", video: "video" };

export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** One URL per pair, whichever order people type: the two slugs in alphabetical order. */
export function canonicalSlug(left: string, right: string) {
  return [left, right].sort().join("-vs-");
}

/** Image and video picks only compare with their own kind. Anything ranked for a text job is text. */
export function trackedModels() {
  const found = new Map<string, { slug: string; name: string; kinds: Set<Modality> }>();
  for (const category of Object.values(models.categories)) {
    for (const pick of [category.leader, category.runner_up, category.open_source_pick]) {
      const slug = slugify(pick.name);
      const entry = found.get(slug) ?? { slug, name: pick.name, kinds: new Set<Modality>() };
      entry.kinds.add(MEDIA[category.slug] ?? "text");
      found.set(slug, entry);
    }
  }
  return [...found.values()].map(({ slug, name, kinds }) => ({
    slug,
    name,
    modality: (kinds.size === 1 ? [...kinds][0] : "text") as Modality,
  }));
}

export function pairSlugs() {
  const tracked = trackedModels();
  const pairs: { slug: string; left: string; right: string; modality: Modality }[] = [];
  for (let i = 0; i < tracked.length; i++) {
    for (let j = i + 1; j < tracked.length; j++) {
      if (tracked[i].modality !== tracked[j].modality) continue;
      const [left, right] = [tracked[i].slug, tracked[j].slug].sort();
      pairs.push({ slug: canonicalSlug(left, right), left, right, modality: tracked[i].modality });
    }
  }
  return pairs;
}

/** Reversed order goes to the one URL. A pair with a model we stopped tracking goes to the model that stayed. */
export function compareRedirects() {
  const live = new Set(pairSlugs().map((pair) => pair.slug));
  const tracked = new Set(trackedModels().map((model) => model.slug));
  const redirects = new Map<string, string>();

  for (const pair of pairSlugs()) {
    redirects.set(`/compare/${pair.right}-vs-${pair.left}`, `/compare/${pair.slug}`);
  }

  const archived = (archiveFile.models ?? []).map((model) => model.slug).filter((slug) => !tracked.has(slug));
  const everyone = [...tracked, ...archived];
  for (const gone of archived) {
    for (const other of everyone) {
      if (other === gone) continue;
      const destination = tracked.has(other) ? `/models/${other}` : "/compare";
      for (const source of [`${gone}-vs-${other}`, `${other}-vs-${gone}`]) {
        if (!live.has(source)) redirects.set(`/compare/${source}`, destination);
      }
    }
  }

  return [...redirects].map(([source, destination]) => ({ source, destination, permanent: true }));
}
