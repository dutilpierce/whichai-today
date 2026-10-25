"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Feedback } from "@/components/Feedback";
import { ModelCard } from "@/components/ModelCard";
import { OptionsPanel } from "@/components/OptionsPanel";
import { PromptPanel } from "@/components/PromptPanel";
import { StageCard } from "@/components/StageCard";
import { Thinking } from "@/components/Thinking";
import { appsWithCapability } from "@/lib/apps";
import { categoryForIntent, intentNotice, matchIntent, type UnrankedIntent } from "@/lib/intents";
import { matchCategory } from "@/lib/match";
import models from "@/lib/models.json";
import { bestInside, decodeChoice, encodeChoice, readSavedChoice, saveChoice, type Choice, DEFAULT_CHOICE } from "@/lib/options";
import { sensitiveKind, sensitiveLine } from "@/lib/sensitive";

type PlanStage = {
  name: string;
  goal: string;
  action: string;
  category: string;
};

type Plan = {
  summary: string;
  stages: PlanStage[];
};

const updatedLabel = new Date(models.last_updated).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const categories = Object.entries(models.categories);

const pillRest =
  "rounded-full border border-zinc-700/80 bg-linear-to-b from-zinc-800 to-zinc-900 px-4 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.55)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.4)]";

const pillSelected =
  "rounded-full border border-emerald-300/80 bg-linear-to-b from-emerald-400 to-emerald-600 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_6px_20px_rgba(16,185,129,0.25)]";

export default function Home() {
  const [mode, setMode] = useState<"quick" | "plan">("quick");
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [intent, setIntent] = useState<UnrankedIntent | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [recommendations, setRecommendations] = useState(0);
  const [feedbackOn, setFeedbackOn] = useState(false);
  const requestId = useRef(0);

  function utmSearch(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    const current = new URLSearchParams(window.location.search);
    for (const [key, value] of current) {
      if (key.startsWith("utm_")) params.append(key, value);
    }
    for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
    const search = params.toString();
    return search ? `?${search}` : "";
  }

  function writeQuery(value: string) {
    window.history.replaceState(null, "", `/${utmSearch({ q: value.trim() })}`);
  }

  function clearQuery() {
    window.history.replaceState(null, "", `/${utmSearch()}`);
  }

  function showCategory(key: string) {
    requestId.current += 1;
    setLoading(false);
    setIntent(null);
    setCategoryKey(key);
  }

  function showIntent(next: UnrankedIntent) {
    requestId.current += 1;
    setLoading(false);
    setCategoryKey(null);
    setIntent(next);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    const unranked = matchIntent(query);
    if (unranked) {
      showIntent(unranked);
      writeQuery(query);
      return;
    }

    const key = matchCategory(query);
    if (key) {
      showCategory(key);
      writeQuery(query);
      return;
    }

    const id = ++requestId.current;
    setCategoryKey(null);
    setIntent(null);
    setLoading(true);
    let next = "general";
    let nextIntent: UnrankedIntent | null = null;
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const covered = categoryForIntent(data?.intent);
      if (covered) next = covered;
      else if (data?.intent && data.intent !== "none") nextIntent = data.intent;
      else if (data?.category in models.categories) next = data.category;
    } catch {}
    if (id !== requestId.current) return;
    setLoading(false);
    if (nextIntent) setIntent(nextIntent);
    else setCategoryKey(next);
    writeQuery(query);
  }

function encodePlan(value: Plan) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodePlan(value: string): Plan | null {
    try {
      const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes)) as Plan;
      if (!data?.summary || !Array.isArray(data.stages)) return null;
      return data;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#plan=")) {
      const restored = decodePlan(decodeURIComponent(hash.slice("#plan=".length)));
      if (restored) {
        setMode("plan");
        setPlan(restored);
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const opt = params.get("opt");
    setChoice(opt ? decodeChoice(opt) : readSavedChoice());
    const q = params.get("q");
    if (!q?.trim()) return;
    setQuery(q);
    const unranked = matchIntent(q);
    if (unranked) {
      setIntent(unranked);
      return;
    }
    const key = matchCategory(q);
    if (key) {
      setCategoryKey(key);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (id !== requestId.current) return;
        const covered = categoryForIntent(data?.intent);
        if (covered) {
          setCategoryKey(covered);
          return;
        }
        if (data?.intent && data.intent !== "none") {
          setIntent(data.intent);
          return;
        }
        setCategoryKey(data?.category in models.categories ? data.category : "general");
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setCategoryKey("general");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!intent) return;
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notranked", intent }),
    }).catch(() => {});
  }, [intent]);

  useEffect(() => {
    if (!categoryKey) return;
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "result", category: categoryKey }),
    }).catch(() => {});
  }, [categoryKey]);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.enabled) return;
        setFeedbackOn(true);
        if (typeof data.recommendations === "number" && data.recommendations > 0) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(() => {});
  }, []);

  async function onPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) return;

    const id = ++requestId.current;
    setPlan(null);
    setPlanError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok || !data?.summary || !Array.isArray(data.stages)) {
        throw new Error("plan failed");
      }
      if (id !== requestId.current) return;
      setPlan(data);
      window.history.replaceState(null, "", `/${utmSearch()}#plan=${encodePlan(data)}`);
    } catch {
      if (id !== requestId.current) return;
      setPlanError(true);
    }
    if (id === requestId.current) setLoading(false);
  }

  const category = categoryKey
    ? models.categories[categoryKey as keyof typeof models.categories]
    : null;
  const capable = intent
    ? appsWithCapability(
        intent === "image" || intent === "design"
          ? "image_generation"
          : intent === "video"
            ? "video_generation"
            : intent === "presentation"
              ? "presentations"
              : "voice",
      ).slice(0, 3)
    : [];

  async function copyPlanLink() {
    if (!plan) return;
    const url = `${window.location.origin}/#plan=${encodePlan(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function updateChoice(next: Choice) {
    setChoice(next);
    saveChoice(next);
  }

  async function copyLink() {
    if (!category) return;
    const opt = encodeChoice(choice);
    const url = query.trim()
      ? `${window.location.origin}/?q=${encodeURIComponent(query.trim())}${opt ? `&opt=${encodeURIComponent(opt)}` : ""}`
      : `${window.location.origin}/${category.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col text-zinc-50">
      <style>{`@keyframes whichai-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-8">
        <p className="flex items-center gap-4 text-lg font-semibold tracking-tight text-white">
          <span className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
            WhichAI.today
          </span>
          <a href="/about" className="text-sm font-medium text-zinc-400 hover:text-white">
            About
          </a>
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Updated {updatedLabel}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-12 pt-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Find the best AI model for the job.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          Today&apos;s best AI model may not be tomorrow&apos;s. Models leapfrog
          each other constantly, and the leader for coding is rarely the leader
          for writing, legal work, math, or speed.
        </p>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Describe what you are working on. You will get today&apos;s top pick, a
          strong alternative, and the best open option. Or describe a whole
          project and get the right model for each stage.
        </p>

        <div className="mt-8 inline-flex gap-1 self-start rounded-full bg-zinc-900 p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]">
          {(
            [
              ["quick", "Quick pick"],
              ["plan", "Plan a project"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                requestId.current += 1;
                setLoading(false);
                setMode(value);
                setIntent(null);
                clearQuery();
              }}
              className={mode === value ? pillSelected : pillRest}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "quick" ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What are you working on right now?"
            aria-label="What are you working on right now?"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-lg text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-300"
          >
            {loading ? "Finding…" : "Find"}
          </button>
        </form>
        ) : null}
        {mode === "quick" ? (
          <p className="mt-3 text-sm text-zinc-500">
            <a href="/pick" className="text-zinc-300 hover:text-white">
              Not sure what to type?
            </a>
          </p>
        ) : null}
        {mode === "quick" ? <OptionsPanel choice={choice} onChange={updateChoice} /> : null}
        {recommendations > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">{recommendations} recommendations given</p>
        ) : null}
        {mode === "plan" ? (
        <form onSubmit={onPlan} className="mt-4 flex flex-col gap-3">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe your project: what you're building, the main parts, timeline, team size, and scale. Example: a mobile app for local dog walkers with booking, payments, and a marketing launch, solo founder, 3 months."
            aria-label="Describe your project"
            rows={5}
            className="w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-base text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="self-start rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-300"
          >
            {loading ? "Planning…" : "Plan it"}
          </button>
        </form>
        ) : null}

        {mode === "quick" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map(([key, item]) => {
            const selected = key === categoryKey;
            return (
              <a
                key={key}
                href={`/${item.slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  showCategory(key);
                  clearQuery();
                }}
                className={selected ? pillSelected : pillRest}
              >
                {item.emoji} {item.display_name}
              </a>
            );
          })}
        </div>
        )}

        {loading && <Thinking mode={mode} />}

        {mode === "plan" && planError && (
          <p className="mt-10 text-sm text-amber-200">
            Couldn&apos;t plan this right now. Try Quick pick or try again.
          </p>
        )}

        {mode === "quick" && intent && (
          <section
            className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            style={{ animation: "whichai-fade 0.35s ease" }}
          >
            <p className="text-base leading-7 text-zinc-200">{intentNotice(intent)}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A text model is not the answer for this. Rankings will appear here once a public board exists.
            </p>
            {capable.length ? (
              <ul className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
                {capable.map((app) => (
                  <li key={app.slug}>
                    <a href={app.link} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200">
                      {app.name}
                    </a>{" "}
                    includes this, from its plan page.
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}

        {mode === "quick" && category && (
          <section
            className="mt-10 flex flex-col gap-4"
            style={{ animation: "whichai-fade 0.35s ease" }}
          >
            {bestInside(category, choice) ? (
              <p className="text-sm leading-6 text-zinc-200">{bestInside(category, choice)}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-400">
              <p>
                {category.emoji} {category.display_name}
              </p>
              <a href={`/${category.slug}`} className="text-zinc-300 hover:text-white">
                More on {category.display_name}
              </a>
              <button type="button" onClick={copyLink} className="text-zinc-300 hover:text-white">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <ModelCard
              model={category.leader}
              label="#1 Champion"
              signal={category.primary_signal}
              leaderScore={category.leader.primary_score}
              runnerScore={category.runner_up.primary_score}
              featured
            />
            <div className="grid gap-4 md:grid-cols-2">
              <ModelCard model={category.runner_up} label="Top Alternative" />
              <ModelCard
                model={category.open_source_pick}
                label="Best Open Source"
              />
            </div>
            {sensitiveKind(query, categoryKey ?? "") === "crisis" ? (
              <p className="text-sm leading-6 text-amber-200">{sensitiveLine("crisis")}</p>
            ) : (
              <>
                {sensitiveLine(sensitiveKind(query, categoryKey ?? "")) ? (
                  <p className="text-sm leading-6 text-amber-200">{sensitiveLine(sensitiveKind(query, categoryKey ?? ""))}</p>
                ) : null}
                <PromptPanel
                  query={query}
                  categoryKey={categoryKey ?? ""}
                  modelName={category.leader.name}
                  provider={category.leader.provider}
                  href={category.leader.direct_link}
                  share
                />
              </>
            )}
            <p className="text-xs text-zinc-500">No affiliate links. No paid placement.</p>
            {feedbackOn ? <Feedback category={categoryKey ?? ""} query={query} /> : null}
          </section>
        )}

        {mode === "plan" && plan && (
          <section
            className="mt-10 flex flex-col gap-4"
            style={{ animation: "whichai-fade 0.35s ease" }}
          >
            <p className="text-base leading-7 text-zinc-200">{plan.summary}</p>
            <button type="button" onClick={copyPlanLink} className="self-start text-sm text-zinc-300 hover:text-white">
              {copied ? "Copied" : "Copy link"}
            </button>
            {plan.stages.map((stage, index) => {
              const stageCategory =
                models.categories[stage.category as keyof typeof models.categories];
              if (!stageCategory) return null;
              return (
                <StageCard
                  key={`${stage.category}-${index}`}
                  index={index + 1}
                  stage={stage}
                  category={stageCategory}
                  categoryKey={stage.category}
                />
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
