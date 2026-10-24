"use client";

import { useState } from "react";

export function CiteThis({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8">
      <p className="text-sm leading-6 text-zinc-300">{text}</p>
      <button type="button" onClick={copy} className="mt-2 text-sm text-zinc-200 hover:text-white">
        {copied ? "Copied" : "Copy citation"}
      </button>
    </div>
  );
}
