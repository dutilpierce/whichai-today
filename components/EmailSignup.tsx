import Link from "next/link";
import site from "@/lib/site.json";

export function EmailSignup() {
  const username = site.buttondown_username.trim();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Email</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        One email when a leader changes. Buttondown is the only service that
        holds the address, and it uses it only to send these alerts. Open and
        click tracking stay off.{" "}
        <Link href="/privacy" className="text-zinc-100 hover:text-white">
          Privacy
        </Link>
      </p>
      {username ? (
        <form
          action={`https://buttondown.com/api/emails/embed-subscribe/${username}`}
          method="post"
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="email-alerts">
            Email address
          </label>
          <input
            id="email-alerts"
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Get alerts
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">Coming soon.</p>
      )}
    </section>
  );
}
