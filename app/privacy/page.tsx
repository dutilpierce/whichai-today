import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "WhichAI.today does not ask for an account. Queries go to Google only when keyword matching misses, and email alerts, when offered, are held only by Buttondown.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy",
    description:
      "WhichAI.today does not ask for an account. Email alerts, when offered, are held only by Buttondown.",
    url: "https://whichai.today/privacy",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header>
        <a href="/" className="text-lg font-semibold tracking-tight text-white">
          WhichAI.today
        </a>
      </header>
      <main className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Privacy
        </h1>
        <div className="mt-6 flex flex-col gap-4 text-base leading-7 text-zinc-300">
          <p>There is no account. The site does not set its own cookies.</p>
          <p>
            Vercel Analytics counts visits without cookies and without a personal profile.
          </p>
          <p>
            A normal search is matched on this site. The words you type are sent to Google
            Gemini only when that match misses, when you use Plan a project, and when you
            open a ready prompt so it can be written for those words. Those requests use
            Google&apos;s paid API tier, where Google does not use prompts to improve its
            products. They are not used to train a model.
          </p>
          <p>
            Email alerts, when the signup is open, go through Buttondown. Buttondown is the
            only service that holds subscriber addresses, and it holds them only to send
            leader-change alerts. Open and click tracking stay off. Unsubscribe from any
            alert email.
          </p>
          <p>
            Rankings, prices, and privacy defaults on the cards come from public pages.
            Each card links the source.
          </p>
        </div>
      </main>
    </div>
  );
}
