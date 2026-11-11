import Link from "next/link";
import { appsWithCapability } from "@/lib/apps";
import { categoryBySlug } from "@/lib/picks";
import tasksFile from "@/lib/tasks.json";

type Task = (typeof tasksFile.tasks)[number] & { capability?: string };

/** Today's pick for one task: the job's leader, or the apps that can do it when no board ranks the task. */
export function taskPick(slug: string) {
  const task = tasksFile.tasks.find((item) => item.slug === slug) as Task | undefined;
  if (!task) return null;
  const leader = task.capability ? null : categoryBySlug(task.category)?.category.leader ?? null;
  const apps = task.capability ? appsWithCapability(task.capability).map((app) => app.name) : [];
  const pick = leader ? `${leader.name} (${leader.provider})` : apps.length ? apps.slice(0, 3).join(", ") : null;
  return { task, leader, apps, pick };
}

export function TaskPicks({ slugs }: { slugs: string[] }) {
  const rows = slugs.map(taskPick).filter((row) => row !== null);
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {rows.map(({ task, leader, pick }) => (
        <li key={task.slug}>
          <Link
            href={`/tasks/${task.slug}`}
            className="block rounded-2xl border border-zinc-800 px-4 py-4 hover:border-zinc-600"
          >
            <span className="block text-base font-medium text-zinc-100">Best AI for {task.title}</span>
            {pick ? (
              <span className="mt-1 block text-sm text-emerald-300">
                {leader ? "Today's pick: " : "Apps that can do it: "}
                {pick}
              </span>
            ) : null}
            <span className="mt-2 block text-sm leading-6 text-zinc-400">{task.tip}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
