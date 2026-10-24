import { pageDates } from "./freshness";
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

export function compareFaqs(found: {
  leader: Named & { cost: string; primary_score: number | null; benchmark_context: string };
  runner: Named & { cost: string; primary_score: number | null };
  categories: {
    display_name: string;
    primary_signal: string;
    leader: { primary_score: number | null };
    runner_up: { primary_score: number | null };
  }[];
}, privacyFor: (provider: string) => { trains_by_default: string } | undefined) {
  const faqs: Faq[] = found.categories.map((category) => {
    const leaderScore = category.leader.primary_score;
    const runnerScore = category.runner_up.primary_score;
    const scores =
      leaderScore !== null && runnerScore !== null
        ? ` ${found.leader.name} scores ${leaderScore} and ${found.runner.name} scores ${runnerScore} on that signal.`
        : "";
    return {
      question: `Which is better for ${category.display_name.toLowerCase()}, ${found.leader.name} or ${found.runner.name}?`,
      answer: `${found.leader.name} leads ${category.display_name.toLowerCase()} on ${category.primary_signal}.${scores}`,
    };
  });
  faqs.push({
    question: "Which is cheaper?",
    answer: `${found.leader.name} costs ${found.leader.cost} ${found.runner.name} costs ${found.runner.cost} These are the stored prices, not a guess about which plan is cheaper for you.`,
  });
  const leaderPrivacy = privacyFor(found.leader.provider);
  const runnerPrivacy = privacyFor(found.runner.provider);
  faqs.push({
    question: "Which is more private?",
    answer: `${found.leader.name}: ${leaderPrivacy?.trains_by_default ?? "Privacy default not checked."} ${found.runner.name}: ${runnerPrivacy?.trains_by_default ?? "Privacy default not checked."}`,
  });
  return faqs;
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
