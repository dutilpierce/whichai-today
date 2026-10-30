import Link from "next/link";
import type { Metadata } from "next";
import { PromptBuilder } from "@/components/PromptBuilder";

export const metadata: Metadata = {
  title: "Prompt builder",
  description:
    "Write a prompt for today's best model. Start with the goal, then add context, format, tone, and language if you want.",
  alternates: { canonical: "/prompt-builder" },
  openGraph: {
    title: "Prompt builder",
    description: "A prompt written for the model that leads the job today.",
    url: "https://whichai.today/prompt-builder",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function PromptBuilderPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Prompt builder</h1>
        <div className="mt-4 flex flex-col gap-4 text-base leading-7 text-zinc-300">
          <p>A useful prompt says what you want, who it is for, and what the answer should look like.</p>
          <p>Name the format. Add an example if the format is easy to miss. Say what to leave out.</p>
          <p>Leave anything you do not know yet in [brackets], and fill it in before you send the prompt.</p>
          <p>
            <Link href="/faq#prompts" className="text-emerald-300 hover:text-emerald-200">
              Common questions about prompts
            </Link>
          </p>
        </div>
        <PromptBuilder />
      </main>
    </div>
  );
}
