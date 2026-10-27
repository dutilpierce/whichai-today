"use client";

import { useState } from "react";

const FEED = "https://whichai.today/feed.xml";

export function CopyFeedLink({ feed = FEED }: { feed?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <code className="rounded-lg bg-zinc-950 px-3 py-2 text-xs text-zinc-300">{feed}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(feed);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="text-sm font-medium text-zinc-200 hover:text-white"
      >
        {copied ? "Copied" : "Copy feed link"}
      </button>
    </div>
  );
}
