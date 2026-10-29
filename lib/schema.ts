import { pageDates } from "./freshness";
import type { Cell, ComparePairRecord } from "./compare";
import { changeTitle, formatDay, modelSlug } from "./picks";

export type Faq = { question: string; answer: string };

type Crumb = { name: string; path: string };

type Named = { name: string; provider: string };

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.path === "/" ? "https://whichai.today" : `https://whichai.today${crumb.path}`,
    })),
  };
}

export function pageGraph(path: string, crumbs: Crumb[], extra: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        url: path === "/" ? "https://whichai.today" : `https://whichai.today${path}`,
        dateModified: pageDates(path).changed,
        breadcrumb: breadcrumbList(crumbs),
      },
      ...extra,
    ],
  };
}

export function faqNode(faqs: Faq[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function categoryFaqs(
  category: {
    display_name: string;
    leader: Named & { why: string; where_to_get: string; cost: string; checked: string };
    runner_up: Named;
    open_source_pick: Named;
  },
  latest: { type?: string; date: string; previous: string | null; leader: string; evidence: string } | null,
) {
  const method = latest?.type === "methodology";
  return [
    {
      question: `Which AI is best for ${category.display_name.toLowerCase()} right now?`,
      answer: `${category.leader.name} from ${category.leader.provider} leads, as of ${formatDay(category.leader.checked)}. ${category.leader.why} The alternative is ${category.runner_up.name}, and the open-weights pick is ${category.open_source_pick.name}.`,
    },
    {
      question: `Where do I get ${category.leader.name}?`,
      answer: `${category.leader.where_to_get} ${category.leader.cost}`,
    },
    {
      question: "Has this leader changed?",
      answer: latest && method
        ? `Ranking method updated on ${formatDay(latest.date)}. ${latest.evidence}`
        : latest?.previous
          ? `${category.leader.name} took the lead on ${formatDay(latest.date)}, replacing ${latest.previous}. ${latest.evidence}`
          : `Tracking for this category began on ${latest ? formatDay(latest.date) : "October 23, 2026"}, with ${category.leader.name} as the first recorded leader.`,
    },
  ];
}

export function categoryItemList(category: {
  leader: Named;
  runner_up: Named;
  open_source_pick: Named;
}) {
  const picks = [category.leader, category.runner_up, category.open_source_pick];
  return {
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: picks.length,
    itemListElement: picks.map((pick, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: pick.name,
      item: `https://whichai.today/models/${modelSlug(pick.name)}`,
    })),
  };
}

export function modelFaqs(
  model: {
    name: string;
    roles: { display_name: string; role: string }[];
    profile: { why?: string; cost?: string };
  },
  privacy?: { trains_by_default: string; opt_out: string } | null,
) {
  const faqs: Faq[] = model.roles.map((role) => ({
    question: `Is ${model.name} good for ${role.display_name.toLowerCase()}?`,
    answer: `${model.name} is the ${role.role.toLowerCase()} pick for ${role.display_name.toLowerCase()}.${model.profile.why ? ` ${model.profile.why}` : ""}`,
  }));
  if (model.profile.cost) {
    faqs.push({
      question: `How much does ${model.name} cost?`,
      answer: model.profile.cost,
    });
  }
  if (privacy) {
    faqs.push({
      question: `Does ${model.name} train on my chats?`,
      answer: `${privacy.trains_by_default} ${privacy.opt_out}`,
    });
  }
  return faqs;
}

function cellText(name: string, cell: Cell) {
  if (!cell) return `${name} is not in today's top three`;
  return `${name} is the ${cell.label === "#1" ? "#1 pick" : `${cell.label.toLowerCase()} pick`}${cell.score !== null ? ` (${cell.score})` : ""}`;
}

export function compareFaqs(
  record: ComparePairRecord,
  privacyFor: (provider: string) => { trains_by_default: string } | undefined,
  released: { a: string | null; b: string | null },
) {
  const { a, b } = record;
  const faqs: Faq[] = record.rows.map((row) => {
    const winner = row.winner === "a" ? a.name : b.name;
    return {
      question: `Is ${a.name} or ${b.name} better for ${row.display_name.toLowerCase()}?`,
      answer: `${winner} ranks ahead for ${row.display_name.toLowerCase()} on ${row.signal}. ${cellText(a.name, row.a)}; ${cellText(b.name, row.b)}.`,
    };
  });
  faqs.push({
    question: `Which is cheaper, ${a.name} or ${b.name}?`,
    answer: `${a.name}: ${a.profile.cost} ${b.name}: ${b.profile.cost}`,
  });
  faqs.push({
    question: `Can I use ${a.name} or ${b.name} for free?`,
    answer: `${a.name}: ${a.profile.free_tier} ${b.name}: ${b.profile.free_tier}`,
  });
  if (released.a && released.b && released.a !== released.b) {
    const [newer, older] = released.a > released.b ? [a, b] : [b, a];
    faqs.push({
      question: `Which is newer, ${a.name} or ${b.name}?`,
      answer: `${newer.name} was released on ${formatDay(newer === a ? released.a : released.b)}, after ${older.name} on ${formatDay(newer === a ? released.b : released.a)}.`,
    });
  }
  const leftPrivacy = privacyFor(a.provider);
  const rightPrivacy = privacyFor(b.provider);
  faqs.push({
    question: `Which is more private, ${a.name} or ${b.name}?`,
    answer: `${a.name} (${a.provider}): ${leftPrivacy?.trains_by_default ?? "Privacy default not checked."} ${b.name} (${b.provider}): ${rightPrivacy?.trains_by_default ?? "Privacy default not checked."}`,
  });
  return faqs;
}

export function releaseArticle(release: { name: string; provider: string; date: string; summary: string }, path: string) {
  return {
    "@type": "NewsArticle",
    headline: `${release.name}: release date and what's new`,
    description: release.summary,
    datePublished: release.date.slice(0, 10),
    dateModified: pageDates(path).changed,
    author: { "@type": "Organization", name: "WhichAI.today", url: "https://whichai.today" },
    about: { "@type": "SoftwareApplication", name: release.name, applicationCategory: "AI model", author: { "@type": "Organization", name: release.provider } },
  };
}

export function changeArticle(
  change: { leader: string; previous: string | null; date: string; type?: string },
  slug: string,
  path: string,
) {
  return {
    "@type": "Article",
    headline: changeTitle(change, slug),
    datePublished: change.date.slice(0, 10),
    dateModified: pageDates(path).changed,
  };
}
