"use client";

import { useState } from "react";

export function EmbedBadge({
  html,
  src,
  alt,
  href,
}: {
  html: string;
  src: string;
  alt: string;
  href: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-white">Embed this pick</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        The image updates when the ranking updates. It links back here.
      </p>
      <a href={href} className="mt-4 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={320} height={40} />
      </a>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs leading-5 text-zinc-300">
        {html}
      </pre>
      <button type="button" onClick={copy} className="mt-3 text-sm text-zinc-200 hover:text-white">
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
