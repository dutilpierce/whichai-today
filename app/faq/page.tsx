import Link from "next/link";
import type { Metadata } from "next";
import { Freshness } from "@/components/Freshness";
import { JsonLd } from "@/components/JsonLd";
import { faqItems, faqSections } from "@/lib/faq";
import { faqNode, pageGraph } from "@/lib/schema";

const title = "AI FAQ: which AI to use and how to write prompts";
const description =
  "Answers on which AI to use for coding, writing, research, images, and video, plus how to write a prompt and whether chats are used for training.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title,
    description,
    url: "https://whichai.today/faq",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function FaqPage() {
  const sections = faqSections();
  const items = faqItems();
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <JsonLd
        data={pageGraph("/faq", [{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }], [faqNode(items)])}
      />
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI FAQ</h1>
        <Freshness path="/faq" />
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Short answers to the questions people ask about choosing an AI, writing a prompt, and keeping chats private.
          Model names, prices, and privacy lines come from the stored rankings, so they move when those records move.
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="On this page">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-emerald-300 hover:text-emerald-200">
              {section.title}
            </a>
          ))}
        </nav>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{section.title}</h2>
            <div className="mt-6 flex flex-col gap-8">
              {section.items.map((item) => (
                <article key={item.question}>
                  <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                  <p className="mt-2 text-base leading-7 text-zinc-300">{item.answer}</p>
                  {item.href && item.linkLabel ? (
                    <p className="mt-2 text-sm">
                      <Link href={item.href} className="text-emerald-300 hover:text-emerald-200">
                        {item.linkLabel}
                      </Link>
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
