import { appList, planPrice } from "./apps";
import { freeAndPaid } from "./options";
import { categoryEntries, formatDay } from "./picks";
import { CHECKS } from "./prompt-text";
import history from "./history.json";
import models from "./models.json";
import providers from "./providers.json";

export type FaqItem = {
  question: string;
  answer: string;
  href?: string;
  linkLabel?: string;
};

export type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

type Category = (typeof models.categories)[keyof typeof models.categories];

function category(key: keyof typeof models.categories): Category {
  return models.categories[key];
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function jobsLedBy(provider: string) {
  return categoryEntries()
    .filter(([, item]) => item.leader.provider === provider)
    .map(([, item]) => item.display_name);
}

function lead(key: keyof typeof models.categories, question: string): FaqItem {
  const item = category(key);
  return {
    question,
    answer: `${item.leader.name} from ${item.leader.provider} leads ${item.display_name.toLowerCase()}, as of ${formatDay(item.leader.checked)}. ${item.leader.why} The alternative is ${item.runner_up.name}, and the open-weights pick is ${item.open_source_pick.name}.`,
    href: `/${item.slug}`,
    linkLabel: item.display_name,
  };
}

function lowestPaid() {
  let best: { app: string; slug: string; plan: string; price: number } | null = null;
  for (const app of appList()) {
    for (const plan of app.plans) {
      if (typeof plan.price_usd_month !== "number" || plan.price_usd_month <= 0 || !plan.source_url) continue;
      if (!best || plan.price_usd_month < best.price) {
        best = { app: app.name, slug: app.slug, plan: plan.name, price: plan.price_usd_month };
      }
    }
  }
  return best;
}

function latestUpdate() {
  return [...history.entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
}

function privacySentence(label: string, provider: keyof typeof providers) {
  const record = providers[provider];
  return `${label}: ${record.trains_by_default} Opt out: ${record.opt_out}`;
}

export function faqSections(): FaqSection[] {
  const general = category("general");
  const everyday = freeAndPaid(general);
  const paid = lowestPaid();
  const latest = latestUpdate();
  const anthropic = jobsLedBy("Anthropic");
  const openai = jobsLedBy("OpenAI");
  const google = jobsLedBy("Google");
  const covered = new Set(["Anthropic", "OpenAI", "Google"]);
  const other = categoryEntries()
    .filter(([, item]) => !covered.has(item.leader.provider))
    .map(([, item]) => `${item.leader.provider} leads ${item.display_name}`);
  const ollama = appList().find((app) => app.slug === "ollama");

  return [
    {
      id: "choosing",
      title: "Choosing an AI",
      items: [
        {
          question: "What is the best AI right now?",
          answer: `There is no single best model. For everyday questions, ${general.leader.name} from ${general.leader.provider} leads, as of ${formatDay(general.leader.checked)}. ${general.leader.why} Coding, writing, research, images, and the other jobs have their own leaders.`,
          href: `/${general.slug}`,
          linkLabel: general.display_name,
        },
        lead("coding", "Which AI is best for coding?"),
        lead("writing_creative", "Which AI is best for writing?"),
        lead("research", "Which AI is best for research with sources?"),
        lead("legal_analysis", "Which AI is best for long documents and contracts?"),
        lead("reasoning_math", "Which AI is best for math and reasoning?"),
        lead("images", "What is the best AI for making images?"),
        lead("video", "What is the best AI for making video?"),
        {
          question: "Is ChatGPT, Claude, or Gemini better?",
          answer: `It depends on the job. Claude's maker, Anthropic, leads ${joinList(anthropic) || "none of today's jobs"}. ChatGPT's maker, OpenAI, leads ${joinList(openai) || "none of today's jobs"}. Gemini's maker, Google, leads ${joinList(google) || "none of today's jobs"}.${other.length ? ` ${joinList(other)}.` : ""} WhichAI.today picks by the job instead of crowning one brand.`,
          href: "/compare",
          linkLabel: "Compare models",
        },
        {
          question: "What is the best free AI?",
          answer: everyday.free
            ? `The stored free pick for everyday questions is ${everyday.free.name}.${everyday.freeLimit ? ` ${everyday.freeLimit}` : ""} Each job page lists its own free pick.`
            : "No free option is stored for everyday questions. Each job page lists a free pick when one is stored.",
          href: "/free",
          linkLabel: "Best free AI",
        },
        {
          question: "Do I need to pay for AI?",
          answer: paid
            ? `You can start without paying. Free plans are stored for several apps. The lowest stored paid plan is ${paid.plan} on ${paid.app} at ${planPrice(paid.price)}.`
            : "You can start without paying. Free plans are stored for several apps. A paid-plan price is not stored yet.",
          href: paid ? `/apps/${paid.slug}` : "/free",
          linkLabel: paid ? paid.app : "Best free AI",
        },
        {
          question: "How often does the best AI change?",
          answer: `A scheduled job checks the public boards every day. A new number one has to come up on two checks in a row before it replaces the current leader, so a one-day blip does not flip the pick.${latest ? ` The latest recorded update is ${formatDay(latest.date)}.` : ""}`,
          href: "/changes",
          linkLabel: "Changes",
        },
        {
          question: "What is the difference between an AI model and an AI app?",
          answer: `An AI model is the system that writes the answer, such as ${general.leader.name}. An AI app is the product you open to use a model, such as ChatGPT, Claude, or Gemini. One app can offer several models.`,
          href: "/which-ai-should-i-use",
          linkLabel: "Which AI should I use",
        },
      ],
    },
    {
      id: "prompts",
      title: "Writing prompts",
      items: [
        {
          question: "What is a prompt?",
          answer:
            "A prompt is the instruction you type into an AI. A useful prompt says what you want done, who it is for, and what the answer should look like.",
          href: "/prompt-builder",
          linkLabel: "Prompt builder",
        },
        {
          question: "How do I write a good prompt?",
          answer: `Name the ${joinList(CHECKS.map((item) => item.label.toLowerCase()))}. ${CHECKS.map((item) => item.hint).join(" ")} Leave anything you do not know yet in [brackets], and fill those in before you send the prompt.`,
          href: "/prompt-builder",
          linkLabel: "Prompt builder",
        },
        {
          question: "How long should a prompt be?",
          answer:
            "Long enough to name the goal, the audience, and the format. A short task can be a few sentences. Put a long document in the context, separate from the instruction, instead of mixing the source into the request.",
          href: "/prompt-builder",
          linkLabel: "Prompt builder",
        },
        {
          question: "Do ChatGPT, Claude, and Gemini need different prompts?",
          answer:
            "The same five parts work for ChatGPT, Claude, and Gemini: goal, context, format, tone, and constraints. Each maker also publishes extra habits, and WhichAI.today stores a sourced guide for each of those three.",
          href: "/prompts/claude",
          linkLabel: "Claude prompt guide",
        },
        {
          question: "Why does AI make things up, and how do I catch it?",
          answer:
            "An AI can state a false name, number, or date as if it were known. Ask it to use only the facts you gave, and check names, numbers, and dates yourself before you rely on the result.",
          href: "/prompt-builder",
          linkLabel: "Prompt builder",
        },
        {
          question: "Can WhichAI.today write a prompt for me?",
          answer:
            "Yes. The prompt builder writes a prompt for today's leader for the job you describe. It fills the goal, context, format, tone, and constraints, and leaves unknown details in brackets.",
          href: "/prompt-builder",
          linkLabel: "Prompt builder",
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      items: [
        {
          question: "Does ChatGPT, Claude, or Gemini train on my chats?",
          answer: `It depends on the app and the setting. ${privacySentence("ChatGPT", "OpenAI")} ${privacySentence("Claude", "Anthropic")} ${privacySentence("Gemini", "Google")}`,
          href: "/privacy",
          linkLabel: "Privacy",
        },
        {
          question: "How do I use AI on private files?",
          answer: `Use an open-weights model you can run yourself when files cannot leave your network. The open-weights pick for everyday questions is ${general.open_source_pick.name}.${ollama ? ` ${ollama.name} is stored as a local app.` : ""}`,
          href: ollama ? `/apps/${ollama.slug}` : `/${general.slug}`,
          linkLabel: ollama ? ollama.name : general.display_name,
        },
        {
          question: "What is an open-weights model?",
          answer:
            "An open-weights model publishes its weights so you can download and run it yourself, often on your own hardware. Every ranked job on WhichAI.today includes one.",
          href: "/methodology",
          linkLabel: "Methodology",
        },
      ],
    },
    {
      id: "whichai",
      title: "About WhichAI.today",
      items: [
        {
          question: "How does WhichAI.today pick models?",
          answer:
            "Public evaluations: LMArena, Artificial Analysis, Vals AI, SWE-bench, GPQA, and Humanity's Last Exam. A daily job rechecks those sources. A new number one has to appear on two checks in a row before it replaces the current leader. The planner does not invent model names.",
          href: "/methodology",
          linkLabel: "Methodology",
        },
        {
          question: "Is WhichAI.today free, and does anyone pay for placement?",
          answer:
            "Yes, WhichAI.today is free. There is no account and no paywall. No paid placement, and no affiliate links in the picks. A model is listed because of the public board for that job.",
          href: "/about",
          linkLabel: "About",
        },
      ],
    },
  ];
}

export function faqItems() {
  return faqSections().flatMap((section) => section.items);
}
