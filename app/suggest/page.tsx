import type { Metadata } from "next";
import { SuggestForm } from "@/components/SuggestForm";

export const metadata: Metadata = {
  title: "Suggest a correction",
  description: "Suggest a model, an app, or a correction. Suggestions never change a ranking on their own.",
  alternates: { canonical: "/suggest" },
  openGraph: {
    title: "Suggest a correction",
    description: "Suggest a model, an app, or a correction.",
    url: "https://whichai.today/suggest",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function SuggestPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Suggest a model, app, or correction</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          This is read by the person who runs the site. It does not change a ranking by itself. Rankings still come from the public boards.
        </p>
        <SuggestForm />
      </main>
    </div>
  );
}
