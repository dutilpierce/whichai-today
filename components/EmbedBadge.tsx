"use client";

import { useState } from "react";

function CopyBlock({ label, value }: { label: string; value: string }) {
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
      <p className="text-sm text-zinc-400">{label}</p>
      <pre className="mt-2 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs leading-5 text-zinc-300">
        {value}
      </pre>
      <button type="button" onClick={copy} className="mt-2 text-sm text-zinc-200 hover:text-white">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function EmbedBadge({
  id,
  heading,
  html,
  text,
  src,
  alt,
  href,
}: {
  id?: string;
  heading: string;
  html: string;
  text: string;
  src: string;
  alt: string;
  href: string;
}) {
  return (
    <section id={id} className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-white">{heading}</h2>
      <a href={href} className="mt-4 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={320} height={40} />
      </a>
      <CopyBlock label="Image" value={html} />
      <CopyBlock label="Text link" value={text} />
    </section>
  );
}
