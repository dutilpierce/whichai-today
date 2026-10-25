"use client";

import { FormEvent, useState } from "react";

const KINDS = [
  { id: "model", label: "A model" },
  { id: "app", label: "An app" },
  { id: "correction", label: "A correction" },
] as const;

export function SuggestForm() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("correction");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, text }),
    }).catch(() => null);
    if (!res) return;
    if (res.status === 204) setSent(true);
    else if (res.status === 200) setUnavailable(true);
  }

  if (sent) return <p className="mt-6 text-sm text-zinc-300">Sent. Suggestions never change a ranking on their own.</p>;
  if (unavailable) {
    return (
      <p className="mt-6 text-sm text-zinc-300">
        Suggestions are closed until storage is connected. You can still{" "}
        <a href="https://github.com/dutilpierce/whichai-today/issues" className="text-emerald-300 hover:text-emerald-200">
          open a GitHub issue
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={
              kind === item.id
                ? "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950"
                : "rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={300}
        required
        rows={4}
        placeholder="What should we look at?"
        aria-label="What should we look at?"
        className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
      />
      <button type="submit" className="self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950">
        Send
      </button>
    </form>
  );
}
