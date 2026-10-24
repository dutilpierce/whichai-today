import type { Faq } from "@/lib/schema";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-white">Questions</h2>
      <div className="mt-6 flex flex-col gap-6">
        {faqs.map((faq) => (
          <section key={faq.question}>
            <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
            <p className="mt-2 text-base leading-7 text-zinc-300">{faq.answer}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
