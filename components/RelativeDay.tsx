"use client";

import { useSyncExternalStore } from "react";
import { daysApart } from "@/lib/releases";
import { formatDay } from "@/lib/picks";

function subscribe() {
  return () => {};
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The page is built ahead of time, so "today" is only known in the browser.
function useToday() {
  return useSyncExternalStore(subscribe, localToday, () => null);
}

export function relativeDay(date: string, today: string | null) {
  if (!today) return formatDay(date);
  const days = daysApart(date, today);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDay(date);
}

export function RelativeDay({ date, className, lower = false }: { date: string; className?: string; lower?: boolean }) {
  const today = useToday();
  const label = relativeDay(date, today);
  return (
    <time dateTime={date.slice(0, 10)} title={formatDay(date)} className={className}>
      {lower && (label === "Today" || label === "Yesterday") ? label.toLowerCase() : label}
    </time>
  );
}

export function NewBadge({ date }: { date: string }) {
  const today = useToday();
  if (!today || daysApart(date, today) > 1) return null;
  return (
    <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-950">
      New
    </span>
  );
}
