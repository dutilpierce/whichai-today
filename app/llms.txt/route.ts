import models from "@/lib/models.json";

export function GET() {
  const reviewed = models.last_updated.slice(0, 10);
  const categories = Object.values(models.categories)
    .map(
      (category) =>
        `## ${category.display_name}\nLeader: ${category.leader.name} (${category.leader.provider}). ${category.leader.why}\nAlternative: ${category.runner_up.name} (${category.runner_up.provider}).\nOpen weights: ${category.open_source_pick.name} (${category.open_source_pick.provider}).`,
    )
    .join("\n\n");

  const body = `# WhichAI.today

WhichAI.today tells you which AI model to use for a specific task today. It is free and needs no account.

People search or describe a project. The site maps the work to a category and shows three picks: today's leader, a strong alternative, and the best open-weights model. Project plans are split into stages, and each stage uses the same rankings. The planner does not invent model names.

Picks come from public evaluations: LMArena, Artificial Analysis, Vals AI, SWE-bench, GPQA, and Humanity's Last Exam. A daily job rechecks those sources and publishes changes. Last reviewed: ${reviewed}.

Canonical pages: https://whichai.today and https://whichai.today/about

${categories}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
