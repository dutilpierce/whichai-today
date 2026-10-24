"use client";

import { useEffect, useState } from "react";

const PLAN_STEPS = [
  "Reading your project",
  "Splitting into stages",
  "Matching today's models",
];

export function Thinking({ mode }: { mode: "quick" | "plan" }) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (mode !== "plan") return;
    const steps = setInterval(
      () => setStep((current) => (current + 1) % PLAN_STEPS.length),
      4000,
    );
    const clock = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => {
      clearInterval(steps);
      clearInterval(clock);
    };
  }, [mode]);

  const status =
    mode === "plan" ? `${PLAN_STEPS[step]} · ${seconds}s` : "Finding the best fit…";

  return (
    <div className="mt-10" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex items-end gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <p className="text-sm text-zinc-200">{status}</p>
      </div>
      {mode === "plan" && (
        <div className="mt-6 flex flex-col gap-4" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="mt-4 h-5 w-2/3 rounded bg-zinc-800" />
              <div className="mt-3 h-3 w-full rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-5/6 rounded bg-zinc-800" />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[0, 1, 2].map((card) => (
                  <div key={card} className="h-20 rounded-xl bg-zinc-800" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
