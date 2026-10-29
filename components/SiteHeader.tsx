"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function current(path: string, href: string) {
  if (href === "/prompt-builder") return path === "/prompt-builder" || path.startsWith("/prompts");
  if (href === "/compare" || href === "/releases") return path === href || path.startsWith(`${href}/`);
  return path === href;
}

export function SiteHeader() {
  const path = usePathname();
  const prompt = current(path, "/prompt-builder");
  const guide = current(path, "/which-ai-should-i-use");
  const compare = current(path, "/compare");
  const releases = current(path, "/releases");
  const free = current(path, "/free");

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-8">
      <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
        WhichAI.today
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Primary">
        <Link
          href="/prompt-builder"
          aria-current={prompt ? "page" : undefined}
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
        >
          Prompt builder
        </Link>
        <Link
          href="/which-ai-should-i-use"
          aria-current={guide ? "page" : undefined}
          className={guide ? "text-sm font-medium text-white" : "text-sm font-medium text-zinc-400 hover:text-white"}
        >
          Which AI
        </Link>
        <Link
          href="/compare"
          aria-current={compare ? "page" : undefined}
          className={compare ? "text-sm font-medium text-white" : "text-sm font-medium text-zinc-400 hover:text-white"}
        >
          Compare
        </Link>
        <Link
          href="/releases"
          aria-current={releases ? "page" : undefined}
          className={releases ? "text-sm font-medium text-white" : "text-sm font-medium text-zinc-400 hover:text-white"}
        >
          Releases
        </Link>
        <Link
          href="/free"
          aria-current={free ? "page" : undefined}
          className={free ? "text-sm font-medium text-white" : "text-sm font-medium text-zinc-400 hover:text-white"}
        >
          Free
        </Link>
      </nav>
    </header>
  );
}
