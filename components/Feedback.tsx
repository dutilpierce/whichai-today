"use client";

import { useState } from "react";

export function Feedback({ category, query }: { category: string; query: string }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  async function send(next: "up" | "down", note = "") {
    setVote(next);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: next, category, query: next === "down" ? query : "", comment: note }),
    }).catch(() => null);
    if (res?.ok || res?.status === 204) setSent(true);
  }

  if (sent && vote !== "down") return <p className="text-sm text-zinc-500">Thanks. This does not change the ranking.</p>;

  return (
    <div className="text-sm text-zinc-400">
      <p>
        Was this the right pick?{" "}
        <button type="button" onClick={() => send("up")} className="text-zinc-200 hover:text-white">
          Yes
        </button>
        {" · "}
        <button type="button" onClick={() => setVote("down")} className="text-zinc-200 hover:text-white">
          No
        </button>
      </p>
      {vote === "down" && !sent ? (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send("down", comment);
          }}
        >
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={300}
            placeholder="What did you expect? (optional)"
            aria-label="What did you expect?"
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
          />
          <button type="submit" className="self-start text-zinc-300 hover:text-white">
            Send
          </button>
        </form>
      ) : null}
      {sent ? <p className="mt-2 text-zinc-500">Thanks. This does not change the ranking.</p> : null}
    </div>
  );
}
