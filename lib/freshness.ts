import freshnessFile from "./freshness.json";
import models from "./models.json";

const freshness = freshnessFile as {
  pages: Record<string, { changed: string; hash: string }>;
};

export function pageDates(path: string) {
  const changed = freshness.pages[path]?.changed ?? models.last_updated.slice(0, 10);
  const checked = models.last_updated.slice(0, 10);
  return {
    changed,
    checked,
    lastModified: new Date(`${changed}T12:00:00Z`),
  };
}
