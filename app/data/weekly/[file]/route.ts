import { blogPosts, plainText, postByWeek, postChanges, postReleases, postUrl } from "@/lib/blog";

export function generateStaticParams() {
  const posts = blogPosts();
  return posts.length ? posts.map((post) => ({ file: `${post.week}.json` })) : [{ file: "_none.json" }];
}

/** One week as open data: the roundup's facts plus every tracked release and ranking change. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const post = postByWeek(file.replace(/\.json$/, ""));
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    name: post.title,
    week: post.week,
    start: post.start,
    end: post.end,
    published: post.published,
    updated: post.updated,
    url: postUrl(post),
    license: "CC BY 4.0",
    attribution: "WhichAI.today",
    summary: post.description,
    takeaways: post.takeaways.map(plainText),
    releases: postReleases(post).map((release) => ({
      date: release.date,
      provider: release.provider,
      name: release.name,
      kind: release.kind,
      status: release.status,
      summary: release.summary,
      source_url: release.source_url,
      url: `https://whichai.today/releases/${release.id}`,
    })),
    ranking_changes: postChanges(post).map((change) => ({
      date: change.date,
      category: change.category.display_name,
      new_leader: change.leader,
      previous_leader: change.previous,
      evidence: change.evidence,
    })),
    companies: post.companies,
    sources: post.sources,
  });
}
