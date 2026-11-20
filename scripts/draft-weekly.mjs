import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { research } from "./ai.mjs";
import {
  RESERVED_IDS,
  deadUrls,
  links,
  postProblems,
  proseOf,
  withoutTrailingCites,
  withoutUrls,
} from "./blog-rules.mjs";

// Drafts the weekly roundup for one ISO week and adds it to lib/blog.json.
// Writer: OpenAI (web search). Backup writer: Claude (web search), then Gemini.
// Editor: Claude checks every claim against the week's data before anything is saved.
//
//   node scripts/draft-weekly.mjs                 previous complete week
//   node scripts/draft-weekly.mjs --week 2026-W46
//   node scripts/draft-weekly.mjs --week 2026-W46 --out draft.json   write nowhere else
//   node scripts/draft-weekly.mjs --force         replace an existing post for the week

const ROOT = new URL("../", import.meta.url);
const BLOG_FILE = new URL("lib/blog.json", ROOT);
const OPENAI_MODEL = process.env.OPENAI_BLOG_MODEL ?? "gpt-6.2-astra";
const EDITOR_MODEL = process.env.CLAUDE_EDITOR_MODEL ?? "claude-sonnet-5-5";
const SITE = "https://whichai.today";

// ---------- weeks ----------

export function isoWeek(date) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  const day = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - day + 3);
  const year = value.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((value - firstThursday) / (7 * 24 * 3600 * 1000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday and Sunday of an ISO week, as YYYY-MM-DD. */
export function weekBounds(week) {
  const [year, number] = week.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (number - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export function previousWeek(today) {
  const value = new Date(`${today}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 7);
  return isoWeek(value.toISOString());
}

export function slugFor(week) {
  const [year, number] = week.split("-W");
  return `ai-news-week-${Number(number)}-${year}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ---------- the week's facts ----------

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, ROOT), "utf8"));
}

/** Everything the post may claim, from this site's own tracked data. */
export async function buildBrief(week) {
  const { start, end } = weekBounds(week);
  const [models, history, releases] = await Promise.all([
    readJson("lib/models.json"),
    readJson("lib/history.json"),
    readJson("lib/releases.json"),
  ]);
  const categories = models.categories;
  // Same rule as modelSlug in lib/picks.ts.
  const modelPage = (name) => `/models/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const ranked = new Set();
  for (const category of Object.values(categories)) {
    for (const slot of ["leader", "runner_up", "open_source_pick"]) ranked.add(category[slot].name);
  }

  const weekReleases = releases.entries
    .filter((entry) => entry.date >= start && entry.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      company: entry.provider,
      name: entry.name,
      kind: entry.kind,
      status: entry.status,
      summary: entry.summary,
      features: entry.features,
      quote_from_announcement: entry.evidence,
      official_announcement: entry.source_url,
      site_page: `/releases/${entry.id}`,
    }));

  const changes = history.entries
    .filter((entry) => entry.previous && (entry.type ?? "change") === "change")
    .filter((entry) => entry.date.slice(0, 10) >= start && entry.date.slice(0, 10) <= end)
    .map((entry) => {
      const category = categories[entry.category];
      return {
        date: entry.date.slice(0, 10),
        job: category?.display_name ?? entry.category,
        new_number_one: entry.leader,
        previous_number_one: entry.previous,
        evidence: entry.evidence,
        site_page: `/changes/${entry.date.slice(0, 10)}-${category?.slug ?? entry.category}`,
      };
    });

  const leaders = Object.values(categories).map((category) => ({
    job: category.display_name,
    site_page: `/${category.slug}`,
    benchmark: category.primary_signal,
    number_one: `${category.leader.name} (${category.leader.provider})`,
    number_one_score: category.leader.primary_score ?? null,
    why: category.leader.why,
    alternative: `${category.runner_up.name} (${category.runner_up.provider})`,
    alternative_score: category.runner_up.primary_score ?? null,
    best_open_weights: `${category.open_source_pick.name} (${category.open_source_pick.provider})`,
    leader_page: modelPage(category.leader.name),
  }));

  const internal = new Set([
    "/",
    "/releases",
    "/compare",
    "/changes",
    "/methodology",
    "/free",
    "/which-ai-should-i-use",
    "/blog",
    ...weekReleases.map((entry) => entry.site_page),
    ...changes.map((entry) => entry.site_page),
    ...leaders.map((entry) => entry.site_page),
    ...[...ranked].map(modelPage),
  ]);

  return {
    week,
    start,
    end,
    counts: { releases: weekReleases.length, ranking_changes: changes.length },
    releases: weekReleases,
    ranking_changes: changes,
    current_rankings: leaders,
    internal,
  };
}

// ---------- prompts ----------

const STYLE = `You write WhichAI.today's weekly AI news roundup. Readers are people who use AI tools at work: curious, busy, not necessarily engineers. Search engines and AI assistants will quote this post, so every claim must be precise, dated, and sourced.

Voice
- Write like a good tech news desk: confident, specific, plain English. Short paragraphs (2-4 sentences). Vary sentence length.
- Lead with what happened and why it matters to someone choosing an AI tool. No throat-clearing, no hype, no hedging filler.
- Use exact names, dates ("on Nov 12"), and numbers. Quote announcements sparingly and only from the data you are given or pages you found.
- Never use these words or phrases: ever-evolving, landscape, delve, game-changer, revolutionize, unleash, unlock, harness, cutting-edge, seamlessly, "it's worth noting", "in conclusion", tapestry, "testament to", "paradigm shift", "a new era", "dive into", realm, "buckle up", "stay tuned".
- Use at most a few em dashes in the whole post. Prefer periods and commas.
- Do not address the reader as "you" more than occasionally. No rhetorical questions as headings.

Accuracy
- The week's data below is verified. Treat it as the source of truth for what was released, when, and by whom, and for the current rankings and scores.
- Use web search for context: reactions, pricing, availability, benchmark details, why a release matters. Only state outside facts you found on a real page, and link that page.
- Never invent a release, a number, a quote, or a URL. If unsure, leave it out.

Links (lots of them)
- Link every company's official announcement the first time you mention a release, using the official_announcement URL from the data.
- Link companies' own sites and any page you cite from search. Aim for 25+ external links across the post.
- Also link this site's pages where helpful, using only the site_page and leader_page paths given in the data (for example [/coding](/coding) style paths). Never make up a site path.
- Write links inline as [anchor text](URL). Anchor text should be descriptive (the product or page name), never "here" or "this link".
- Put each link on the words it supports. Never tack a bare source onto the end of a paragraph like "([openai.com](https://...))".`;

const SHAPE = `Return only a JSON object, no prose before or after, with exactly these fields:
{
  "title": "Headline, 50-100 characters, leads with the week's biggest story and includes the date range, e.g. 'AI This Week: <lead story> and <n> More Releases (Nov 9-15, 2026)'",
  "description": "One or two sentences, 130-200 characters, for search results",
  "takeaways": ["5-7 one-sentence facts, each standalone and quotable, with a date or number. Links allowed."],
  "sections": [{ "heading": "Plain, descriptive heading (not a question)", "paragraphs": ["2-6 paragraphs with inline [text](url) links"] }],
  "faqs": [{ "question": "A question people search, e.g. 'What AI models were released this week?'", "answer": "2-3 sentence plain-text answer with no links" }],
  "companies": [{ "name": "Company", "url": "https://official site" }],
  "sources": [{ "name": "Page title", "url": "https://..." }]
}
Write 5-7 sections (lead story first, then themes such as new models, coding, open weights, enterprise, ranking changes), 4-5 FAQs, and 2,000-3,500 words in total. List every company you mention in "companies" and every external page you link in "sources".`;

function briefText(brief) {
  const { internal, ...facts } = brief;
  return JSON.stringify({ ...facts, allowed_site_pages: [...internal] }, null, 1);
}

function draftPrompt(brief) {
  return `Write the roundup for ${brief.start} to ${brief.end} (${brief.week}).

${SHAPE}

The week's verified data:
${briefText(brief)}`;
}

function revisionPrompt(brief, draft, problems) {
  return `Revise this draft so it passes every check below. Keep what is good; fix only what is needed.

Checks that failed:
${problems.map((problem) => `- ${problem}`).join("\n")}

${SHAPE}

The week's verified data:
${briefText(brief)}

The draft:
${JSON.stringify(draft)}`;
}

export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

// ---------- writers ----------

async function writeWithOpenAI(prompt) {
  const client = new OpenAI({ timeout: 20 * 60 * 1000, maxRetries: 1 });
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: STYLE,
    input: prompt,
    reasoning: { effort: "medium" },
    tools: [{ type: "web_search", search_context_size: "medium" }],
    include: ["web_search_call.action.sources"],
    max_output_tokens: 32000,
  });
  if (response.status === "incomplete") {
    throw new Error(`OpenAI stopped early: ${response.incomplete_details?.reason ?? "unknown"}`);
  }
  if (!response.output_text?.trim()) throw new Error("OpenAI returned no text");
  return extractJson(response.output_text);
}

async function writeWithClaude(prompt) {
  // Claude with web search, falling back to Gemini, via the shared research helper.
  const text = await research(`${STYLE}\n\n${prompt}`, { timeoutMs: 15 * 60 * 1000, maxSearches: 15, effort: "high" });
  return extractJson(text);
}

/** Try OpenAI, then Claude/Gemini. Returns the draft and which writer produced it. */
async function write(prompt) {
  const errors = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      return { draft: await writeWithOpenAI(prompt), writer: `openai:${OPENAI_MODEL}` };
    } catch (error) {
      console.error(`OpenAI draft failed: ${error.message}`);
      errors.push(`OpenAI: ${error.message}`);
    }
  }
  if (process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      return { draft: await writeWithClaude(prompt), writer: process.env.ANTHROPIC_API_KEY ? "claude" : "gemini" };
    } catch (error) {
      console.error(`Backup draft failed: ${error.message}`);
      errors.push(`backup: ${error.message}`);
    }
  }
  throw new Error(errors.length ? errors.join("; ") : "No writer is configured (OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY)");
}

// ---------- editor ----------

const LINKED = { type: "object", properties: { name: { type: "string" }, url: { type: "string" } }, required: ["name", "url"], additionalProperties: false };
const POST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    takeaways: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
        required: ["heading", "paragraphs"],
        additionalProperties: false,
      },
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    companies: { type: "array", items: LINKED },
    sources: { type: "array", items: LINKED },
  },
  required: ["title", "description", "takeaways", "sections", "faqs", "companies", "sources"],
  additionalProperties: false,
};

/** Claude fact-checks the draft against the week's data and fixes anything unsupported or robotic. */
async function edit(brief, draft) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ timeout: 10 * 60 * 1000, maxRetries: 2 });
  const response = await client.beta.messages
    .stream({
      model: EDITOR_MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: POST_SCHEMA } },
      system: `You are the copy editor and fact checker for WhichAI.today's weekly AI roundup. ${STYLE.split("Links (lots of them)")[0]}`,
      messages: [
        {
          role: "user",
          content: `Edit this draft and return the full corrected post in the same JSON shape.

Do:
- Check every release, date, company, model name, number, and ranking claim against the verified data. Fix anything that contradicts it. Delete any claim about this week's releases or rankings that the data does not support.
- Keep outside context that is linked to a source page; you cannot verify those pages, so keep them unless they contradict the data.
- Keep every link, unless its claim was deleted. Never add a URL that is not already in the draft or the data. Site links must be paths from allowed_site_pages.
- Remove robotic phrasing and filler; keep the voice of a sharp news desk. Keep the length (2,000-3,500 words) and structure.
- FAQ answers stay plain text with no links. Numbers in takeaways and FAQ answers must appear in the data.

Verified data:
${briefText(brief)}

Draft:
${JSON.stringify(draft)}`,
        },
      ],
    })
    .finalMessage();
  if (response.stop_reason === "refusal") throw new Error("the editor declined");
  if (response.stop_reason === "max_tokens") throw new Error("the editor's answer was cut off");
  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  return JSON.parse(text);
}

// ---------- assembling ----------

function finish(draft, brief, writer, today, previous) {
  // The page adds these sections itself, so drafted sections can't take their ids.
  const used = new Set(RESERVED_IDS);
  const sections = draft.sections.map((section) => {
    let id = slugify(section.heading) || "section";
    while (used.has(id)) id = `${id}-2`;
    used.add(id);
    return { id, heading: section.heading.trim(), paragraphs: section.paragraphs.map((p) => p.trim()) };
  });
  return {
    week: brief.week,
    slug: slugFor(brief.week),
    start: brief.start,
    end: brief.end,
    published: previous?.published ?? today,
    updated: today,
    title: draft.title.trim(),
    description: draft.description.trim(),
    takeaways: draft.takeaways.map((item) => item.trim()),
    sections,
    faqs: draft.faqs.map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() })),
    companies: dedupe(draft.companies),
    sources: dedupe([
      ...draft.sources,
      // Every external page the body links is listed as a source.
      ...proseOf(draft)
        .flatMap(links)
        .filter((link) => link.url.startsWith("https://"))
        .map((link) => ({ name: link.text, url: link.url })),
    ]),
    writer,
  };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function check(draft, brief) {
  return postProblems(draft, { facts: briefText(brief), internal: brief.internal });
}

async function run({ week, force, out }) {
  const today = new Date().toISOString().slice(0, 10);
  const blog = JSON.parse(await readFile(BLOG_FILE, "utf8"));
  const previous = blog.posts.find((post) => post.week === week) ?? null;
  if (previous && !force && !out) {
    console.log(`A post for ${week} already exists (${previous.slug}). Use --force to replace it.`);
    return;
  }

  const brief = await buildBrief(week);
  console.log(`${week}: ${brief.counts.releases} releases, ${brief.counts.ranking_changes} ranking changes`);
  if (brief.counts.releases < 3) throw new Error(`Only ${brief.counts.releases} releases in ${week}; not enough for a roundup.`);

  let { draft, writer } = await write(draftPrompt(brief));
  draft = withoutTrailingCites(draft);
  console.log(`drafted by ${writer}`);
  let problems = check(draft, brief);
  if (problems.length) {
    console.log(`draft needs revision:\n- ${problems.join("\n- ")}`);
    ({ draft, writer } = await write(revisionPrompt(brief, draft, problems)));
    draft = withoutTrailingCites(draft);
    problems = check(draft, brief);
  }

  try {
    const edited = await edit(brief, draft);
    if (edited) {
      const editedProblems = check(edited, brief);
      if (editedProblems.length <= problems.length) {
        draft = edited;
        problems = editedProblems;
        writer = `${writer}+edited:${EDITOR_MODEL}`;
        console.log("edited and fact-checked by Claude");
      } else {
        console.log(`kept the unedited draft; the edit introduced:\n- ${editedProblems.join("\n- ")}`);
      }
    } else {
      console.log("no ANTHROPIC_API_KEY; skipped the Claude edit pass");
    }
  } catch (error) {
    console.error(`edit pass failed, keeping the draft: ${error.message}`);
  }

  // Dead links become plain text rather than blocking the week.
  const urls = [
    ...proseOf(draft).flatMap(links).map((link) => link.url),
    ...draft.companies.map((item) => item.url),
    ...draft.sources.map((item) => item.url),
  ];
  const dead = await deadUrls(urls);
  if (dead.size) {
    console.log(`removed ${dead.size} dead link(s):\n- ${[...dead].join("\n- ")}`);
    draft = withoutUrls(draft, dead);
    problems = check(draft, brief);
  }

  if (problems.length) {
    throw new Error(`The ${week} roundup failed its checks and was held back:\n- ${problems.join("\n- ")}`);
  }

  const post = finish(draft, brief, writer, today, previous);
  if (out) {
    await writeFile(out, `${JSON.stringify(post, null, 2)}\n`);
    console.log(`wrote ${out} (not published)`);
    return;
  }
  blog.posts = [post, ...blog.posts.filter((item) => item.week !== week)].sort((a, b) => b.week.localeCompare(a.week));
  await writeFile(BLOG_FILE, `${JSON.stringify(blog, null, 2)}\n`);
  console.log(`saved ${SITE}/blog/${post.slug}`);
}

// ---------- self-check ----------

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfCheck() {
  assert(isoWeek("2026-11-15") === "2026-W46", "Nov 15 2026 is in W46");
  assert(isoWeek("2026-11-16") === "2026-W47", "Nov 16 2026 starts W47");
  const bounds = weekBounds("2026-W46");
  assert(bounds.start === "2026-11-09" && bounds.end === "2026-11-15", "W46 runs Nov 9-15");
  assert(weekBounds("2026-W01").start === "2025-12-29", "W01 of 2026 starts Dec 29 2025");
  assert(previousWeek("2026-11-23") === "2026-W47", "the Monday run covers the week before");
  assert(slugFor("2026-W46") === "ai-news-week-46-2026", "slug format");
  assert(extractJson('Here you go: {"a": {"b": 1}} done').a.b === 1, "extracts JSON from prose");
  const cited = withoutTrailingCites({
    sections: [
      {
        paragraphs: [
          "[A](https://a.com/x) shipped. ([a.com](https://a.com/x))",
          "B shipped. ([b.com](https://b.com/y))",
        ],
      },
    ],
  }).sections[0].paragraphs;
  assert(cited[0] === "[A](https://a.com/x) shipped.", "drops a tacked-on cite when another link remains");
  assert(cited[1].endsWith("([b.com](https://b.com/y))"), "keeps a cite that is the paragraph's only link");
  console.log("draft-weekly self-check ok");
}

// ---------- main ----------

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/draft-weekly.mjs")) {
  const args = process.argv.slice(2);
  if (args.includes("--self-check")) {
    selfCheck();
    process.exit(0);
  }
  const value = (flag) => {
    const index = args.indexOf(flag);
    return index === -1 ? null : args[index + 1];
  };
  const week = value("--week") || previousWeek(new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-W\d{2}$/.test(week)) {
    console.error(`Bad --week ${week}; use the form 2026-W46.`);
    process.exit(1);
  }
  try {
    await run({ week, force: args.includes("--force"), out: value("--out") });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
