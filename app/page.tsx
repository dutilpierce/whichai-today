import { HomeTool } from "@/components/HomeTool";
import { ReleaseFeed } from "@/components/ReleaseFeed";
import { releaseRows } from "@/lib/release-rows";
import { daysApart, lastChecked } from "@/lib/releases";

const HOME_ROWS = 8;
const JUST_RELEASED_DAYS = 7;

export default function Home() {
  const rows = releaseRows(HOME_ROWS);
  const checked = lastChecked();
  const newest = rows[0];
  const latest =
    newest && checked && daysApart(newest.date, checked) <= JUST_RELEASED_DAYS
      ? { id: newest.id, name: newest.name, date: newest.date }
      : null;

  return (
    <HomeTool latest={latest}>
      <ReleaseFeed entries={rows} />
    </HomeTool>
  );
}
