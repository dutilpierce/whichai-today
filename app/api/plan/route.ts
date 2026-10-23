import { categoryGuide, categoryKeys, generateJson } from "@/lib/gemini";

const MODEL = process.env.PLANNER_MODEL ?? "gemini-3.8-flash";

const instructions = [
  "You break a project into practical stages for WhichAI.today.",
  "Each stage gets exactly one category key from this list:",
  categoryGuide(),
  "Order the stages the way the work should happen, and size them to the project's scale, timeline, and team.",
  "Do not name any AI models. The site attaches models from its own rankings.",
  "Return 3 to 6 stages.",
].join("\n");

type Stage = {
  name?: string;
  goal?: string;
  action?: string;
  category?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, 2000)
      : "";

  if (!description) {
    return Response.json({ error: "Description is required" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "Planner is unavailable" }, { status: 503 });
  }

  try {
    const data = await generateJson<{ summary?: string; stages?: Stage[] }>({
      model: MODEL,
      system: instructions,
      prompt: description,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          stages: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                goal: { type: "string" },
                action: { type: "string" },
                category: { type: "string", enum: categoryKeys },
              },
              required: ["name", "goal", "action", "category"],
            },
          },
        },
        required: ["summary", "stages"],
      },
      timeoutMs: 20_000,
    });

    const summary = clean(data.summary);
    const stages = (data.stages ?? [])
      .map((stage) => ({
        name: clean(stage.name),
        goal: clean(stage.goal),
        action: clean(stage.action),
        category: clean(stage.category),
      }))
      .filter(
        (stage) =>
          stage.name &&
          stage.goal &&
          stage.action &&
          categoryKeys.includes(stage.category),
      );

    if (!summary || stages.length < 1 || stages.length > 6) {
      throw new Error("Planner returned an unusable plan");
    }

    return Response.json({ summary, stages });
  } catch (error) {
    console.error("plan failed", error);
    return Response.json({ error: "Planner is unavailable" }, { status: 503 });
  }
}
