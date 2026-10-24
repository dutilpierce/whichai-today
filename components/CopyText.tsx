"use client";

import { useState } from "react";

export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4">
      <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm leading-6 text-zinc-200">
        {value}
      </pre>
      <button type="button" onClick={copy} className="mt-2 text-sm text-zinc-200 hover:text-white">
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
