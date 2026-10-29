"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CHECKS, TWEAKS, fieldValue, firstHint, isTweak, templatePrompt, type TweakId } from "@/lib/prompt-text";

// The shared panel only mounts in the browser, after a result appears, so a shared link can be read on first render.
function linkedTweaks(share: boolean): TweakId[] {
  if (!share || typeof window === "undefined") return [];
  return (new URLSearchParams(window.location.search).get("tw") ?? "").split(",").filter(isTweak);
}

function writeTweaks(tweaks: string[]) {
  const params = new URLSearchParams(window.location.search);
  if (tweaks.length) params.set("tw", tweaks.join(","));
  else params.delete("tw");
  const search = params.toString();
  window.history.replaceState(null, "", `/${search ? `?${search}` : ""}`);
}

export function PromptPanel({
  query,
  categoryKey,
  modelName,
  provider,
  href,
  share = false,
  primary = false,
  disabled = false,
}: {
  query: string;
  categoryKey: string;
  modelName: string;
  provider: string;
  href: string;
  share?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  const [tweaks, setTweaks] = useState<TweakId[]>(() => linkedTweaks(share));
  const [open, setOpen] = useState(() => linkedTweaks(share).length > 0);
  // Written text belongs to one query; a new query shows its template until the written prompt arrives.
  const [written, setWritten] = useState<{ key: string; text: string } | null>(null);
  const [past, setPast] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const skip = useRef(false);
  const key = `${categoryKey}|${query}`;
  const template = templatePrompt(query, categoryKey);
  const text = written?.key === key ? written.text : template;

  useEffect(() => {
    if (!open || !query.trim()) return;
    const asked = `${categoryKey}|${query}`;
    if (skip.current) {
      skip.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, category: categoryKey, target: modelName, tweaks }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.prompt === "string" && data.prompt.trim()) setWritten({ key: asked, text: data.prompt });
      })
      // A failed request keeps whatever is showing: the template, or the last written prompt.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, query, categoryKey, modelName, tweaks]);

  function addTweak(id: TweakId) {
    setPast((items) => [...items, text]);
    const next = [...tweaks, id].slice(-5);
    setTweaks(next);
    if (share) writeTweaks(next);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (previous) setWritten({ key, text: previous });
    setPast((items) => items.slice(0, -1));
    const next = tweaks.slice(0, -1);
    skip.current = true;
    setTweaks(next);
    if (share) writeTweaks(next);
  }

  function reset() {
    setPast([]);
    setTweaks([]);
    setWritten(null);
    if (share) writeTweaks([]);
  }

  function track(type: "copy" | "open") {
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, category: categoryKey }),
    }).catch(() => {});
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track("copy");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const hint = firstHint(text);
  const filled = (prefix: string) => {
    const value = fieldValue(text, prefix);
    return Boolean(value) && !value.includes("[");
  };

  if (!open) {
    const solid = disabled
      ? "inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-zinc-950 opacity-40"
      : "inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-zinc-950 hover:bg-emerald-400";
    const outlined =
      "rounded-full border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10";
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        className={`self-start ${primary ? solid : outlined}`}
      >
        {primary ? "Get my prompt \u2192" : "Get a ready prompt for this task"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-200">
          Ready prompt for {modelName}
          {loading ? <span className="text-zinc-500"> · Writing…</span> : null}
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-white">
          Hide
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
        {text}
      </pre>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={copy} className="font-medium text-emerald-300 hover:text-emerald-200">
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          onClick={() => track("open")}
          className="font-medium text-zinc-300 hover:text-white"
        >
          Open {provider}
        </a>
        {past.length > 0 ? (
          <button type="button" onClick={undo} className="text-zinc-400 hover:text-white">
            Undo
          </button>
        ) : null}
        {tweaks.length > 0 ? (
          <button type="button" onClick={reset} className="text-zinc-400 hover:text-white">
            Reset
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TWEAKS.map((tweak) => (
          <button
            key={tweak.id}
            type="button"
            onClick={() => addTweak(tweak.id)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-emerald-500"
          >
            {tweak.label}
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {CHECKS.map((item) => (
          <li key={item.label}>
            {filled(item.prefix) ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
      <p className="mt-3 text-xs">
        <Link href="/prompt-builder" className="text-zinc-400 hover:text-white">
          Open the prompt builder
        </Link>
      </p>
    </div>
  );
}
