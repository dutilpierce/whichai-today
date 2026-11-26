import { HomeTool } from "@/components/HomeTool";
import models from "@/lib/models.json";
import { ReleaseFeed } from "@/components/ReleaseFeed";
import { releaseRows } from "@/lib/release-rows";
import { daysApart, lastChecked } from "@/lib/releases";

const HOME_ROWS = 8;
const JUST_RELEASED_DAYS = 7;

export default function Home() {
  const rows = releaseRows(HOME_ROWS);
  const checked = lastChecked();
  // The pill shows the newest data on the page: rankings refresh weekly, releases twice a day.
  const updated = [models.last_updated, checked].filter((value): value is string => Boolean(value)).sort().at(-1) ?? models.last_updated;
  const newest = rows[0];
  const latest =
    newest && checked && daysApart(newest.date, checked) <= JUST_RELEASED_DAYS
      ? { id: newest.id, name: newest.name, date: newest.date }
      : null;

  return (
    <HomeTool latest={latest} updated={updated}>
      <ReleaseFeed entries={rows} />
    </HomeTool>
  );
}
