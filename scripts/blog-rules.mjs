// Quality gates for the weekly roundup. Used by draft-weekly.mjs before publishing
// and by fact-check.mjs on every run, so a bad post can't slip in by hand either.

export const LINK = /\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]*)\)/g;

// Section ids the post page renders itself (app/blog/[slug]/page.tsx).
export const RESERVED_IDS = ["takeaways", "contents", "every-release", "ranking-changes", "questions", "sources"];

// Phrases that make writing read as machine-made. Matched case-insensitively.
export const BANNED = [
  "ever-evolving",
  "rapidly evolving landscape",
  "in today's fast-paced",
  "in the world of ai",
  "landscape of ai",
  "delve",
  "game-changer",
  "game changer",
  "revolutionize",
  "revolutionizing",
  "unleash",
  "unlock the power",
  "harness the power",
  "cutting-edge",
  "seamlessly",
  "it's worth noting",
  "it is worth noting",
  "in conclusion",
  "buckle up",
  "tapestry",
  "testament to",
  "paradigm shift",
  "a new era",
  "stay tuned",
  "without further ado",
  "let's dive",
  "dive into",
  "navigating the",
  "realm of",
  "at the end of the day",
];

const LIMITS = {
  words: [1500, 4500],
  takeaways: [4, 7],
  sections: [4, 8],
  paragraphs: [2, 8],
  faqs: [3, 6],
  companies: 3,
  sources: 5,
  externalLinks: 15,
  emDashes: 8,
};

export function links(text) {
  return [...String(text).matchAll(LINK)].map((match) => ({ text: match[1], url: match[2] }));
}

export function plain(text) {
  return String(text).replace(LINK, "$1");
}

export function words(text) {
  return plain(text).split(/\s+/).filter(Boolean).length;
}

/** Every prose string in a post, for word counts and phrase checks. */
export function proseOf(post) {
  return [
    post.title,
    post.description,
    ...(post.takeaways ?? []),
    ...(post.sections ?? []).flatMap((section) => [section.heading, ...(section.paragraphs ?? [])]),
    ...(post.faqs ?? []).flatMap((faq) => [faq.question, faq.answer]),
  ].filter((item) => typeof item === "string");
}

/** Numbers a reader would take as facts: "1,813", "88.5", "23%". Years and small counts are skipped. */
export function factNumbers(text) {
  return [...plain(text).matchAll(/\d[\d,]*(?:\.\d+)?%?/g)]
    .map((match) => match[0].replace(/,/g, ""))
    .filter((value) => {
      const number = Number.parseFloat(value);
      if (/^20[2-3]\d$/.test(value)) return false;
      return value.includes(".") || value.endsWith("%") || number >= 10;
    });
}

/**
 * Structural and style rules. `context.facts` is the week brief as text; numbers in the
 * takeaways and FAQ answers (the lines most likely to be quoted) must appear in it.
 * `context.internal` is the set of on-site paths a post may link to.
 */
export function postProblems(post, context = {}) {
  const problems = [];
  const need = (condition, message) => {
    if (!condition) problems.push(message);
  };
  const inRange = (value, [low, high]) => value >= low && value <= high;

  need(typeof post.title === "string" && inRange(post.title.length, [30, 110]), "title must be 30-110 characters");
  need(
    typeof post.description === "string" && inRange(post.description.length, [100, 220]),
    "description must be 100-220 characters",
  );
  need(Array.isArray(post.takeaways) && inRange(post.takeaways.length, LIMITS.takeaways), "need 4-7 takeaways");
  need(Array.isArray(post.sections) && inRange(post.sections.length, LIMITS.sections), "need 4-8 sections");
  need(Array.isArray(post.faqs) && inRange(post.faqs.length, LIMITS.faqs), "need 3-6 FAQs");
  if (problems.length) return problems;

  for (const section of post.sections) {
    need(Boolean(section.heading?.trim()), "a section has no heading");
    need(
      Array.isArray(section.paragraphs) && inRange(section.paragraphs.length, LIMITS.paragraphs),
      `section "${section.heading}" needs 2-8 paragraphs`,
    );
    need(
      section.paragraphs.some((paragraph) => links(paragraph).length > 0),
      `section "${section.heading}" has no links`,
    );
  }
  for (const faq of post.faqs) {
    need(links(faq.answer).length === 0, `FAQ answer has a link: "${faq.question}"`);
    need(faq.answer.length <= 450, `FAQ answer is too long: "${faq.question}"`);
  }

  const total = proseOf(post).map(words).reduce((sum, count) => sum + count, 0);
  need(inRange(total, LIMITS.words), `post is ${total} words; needs ${LIMITS.words[0]}-${LIMITS.words[1]}`);

  const prose = proseOf(post).join(" ");
  const lower = plain(prose).toLowerCase();
  for (const phrase of BANNED) {
    if (lower.includes(phrase)) problems.push(`uses the phrase "${phrase}"`);
  }
  const dashes = (prose.match(/—/g) ?? []).length;
  need(dashes <= LIMITS.emDashes, `uses ${dashes} em dashes; keep it to ${LIMITS.emDashes} or fewer`);

  const allLinks = proseOf(post).flatMap(links);
  const external = new Set(allLinks.filter((link) => link.url.startsWith("https://")).map((link) => link.url));
  need(external.size >= LIMITS.externalLinks, `only ${external.size} external links; need ${LIMITS.externalLinks}+`);
  if (context.internal) {
    for (const link of allLinks) {
      if (link.url.startsWith("/") && !context.internal.has(link.url.split("#")[0])) {
        problems.push(`links to an unknown site page: ${link.url}`);
      }
    }
  }

  need(Array.isArray(post.companies) && post.companies.length >= LIMITS.companies, "need 3+ companies");
  need(Array.isArray(post.sources) && post.sources.length >= LIMITS.sources, "need 5+ sources");
  for (const item of [...(post.companies ?? []), ...(post.sources ?? [])]) {
    need(typeof item.name === "string" && item.name.trim(), "a company or source has no name");
    need(typeof item.url === "string" && item.url.startsWith("https://"), `not an https link: ${item.url}`);
  }

  if (context.facts) {
    const facts = context.facts.replace(/,/g, "");
    for (const line of [...post.takeaways, ...post.faqs.map((faq) => faq.answer)]) {
      for (const number of factNumbers(line)) {
        if (!facts.includes(number.replace(/%$/, ""))) {
          problems.push(`"${number}" in "${plain(line).slice(0, 60)}..." is not in this week's data`);
        }
      }
    }
  }
  return problems;
}

/** Shape of a stored post (lib/blog.json), checked by fact-check on every run. */
export function storedPostProblems(post) {
  const problems = [];
  for (const field of ["week", "slug", "start", "end", "published", "updated", "writer"]) {
    if (typeof post[field] !== "string" || !post[field]) problems.push(`${post.slug ?? "post"}: missing ${field}`);
  }
  if (!/^\d{4}-W\d{2}$/.test(post.week ?? "")) problems.push(`${post.slug}: bad week ${post.week}`);
  if (!/^[a-z0-9-]+$/.test(post.slug ?? "")) problems.push(`${post.slug}: bad slug`);
  if ((post.updated ?? "") < (post.published ?? "")) problems.push(`${post.slug}: updated before published`);
  const ids = (post.sections ?? []).map((section) => section.id);
  if (new Set(ids).size !== ids.length) problems.push(`${post.slug}: duplicate section ids`);
  for (const id of ids) {
    if (RESERVED_IDS.includes(id)) problems.push(`${post.slug}: section id "${id}" is used by the page itself`);
  }
  return problems;
}

/** A missing page means the URL was guessed. Hosts that block bots (401, 403, 429) get the benefit of the doubt. */
export function deadLink(status, code) {
  if (code === "ENOTFOUND") return true;
  if (status === 401 || status === 403 || status === 429) return false;
  return typeof status === "number" && status >= 400;
}

const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Fetch each external URL once; return the ones that are dead. */
export async function deadUrls(urls) {
  const dead = new Set();
  const unique = [...new Set(urls.filter((url) => url.startsWith("https://")))];
  await Promise.all(
    unique.map(async (url) => {
      try {
        const res = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
          headers: { "User-Agent": AGENT },
        });
        if (deadLink(res.status)) dead.add(url);
      } catch (error) {
        if (deadLink(undefined, error?.cause?.code || error?.code)) dead.add(url);
      }
    }),
  );
  return dead;
}

/** Turn dead links back into plain text and drop dead companies and sources. */
export function withoutUrls(post, dead) {
  const strip = (text) => String(text).replace(LINK, (whole, label, url) => (dead.has(url) ? label : whole));
  return {
    ...post,
    takeaways: post.takeaways.map(strip),
    sections: post.sections.map((section) => ({ ...section, paragraphs: section.paragraphs.map(strip) })),
    companies: post.companies.filter((item) => !dead.has(item.url)),
    sources: post.sources.filter((item) => !dead.has(item.url)),
  };
}
