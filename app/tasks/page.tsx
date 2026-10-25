import type { Metadata } from "next";
import models from "@/lib/models.json";
import { shortLabel } from "@/lib/picks";
import tasksFile from "@/lib/tasks.json";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Best AI model for everyday tasks, using today's category rankings.",
  alternates: { canonical: "/tasks" },
  openGraph: {
    title: "Tasks",
    description: "Everyday tasks mapped to today's model rankings.",
    url: "https://whichai.today/tasks",
    siteName: "WhichAI.today",
    type: "website",
  },
};

export default function TasksPage() {
  const groups = Object.values(models.categories).map((category) => ({
    category,
    tasks: tasksFile.tasks.filter((task) => task.category === category.slug),
  })).filter((group) => group.tasks.length);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <main>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Tasks</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Each task uses the current picks for one job, plus a tip that is specific to the task.
        </p>
        {tasksFile.tasks.some((task) => "capability" in task && task.capability) ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-white">Not ranked</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {tasksFile.tasks
                .filter((task) => "capability" in task && task.capability)
                .map((task) => (
                  <li key={task.slug}>
                    <a href={`/tasks/${task.slug}`} className="text-sm text-zinc-300 hover:text-white">
                      Best AI for {task.title}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
        {groups.map(({ category, tasks }) => (
          <section key={category.slug} className="mt-10">
            <h2 className="text-xl font-semibold text-white">
              <a href={`/${category.slug}`} className="hover:text-emerald-200">
                {category.emoji} {shortLabel(category.slug)}
              </a>
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {tasks.map((task) => (
                <li key={task.slug}>
                  <a href={`/tasks/${task.slug}`} className="text-sm text-zinc-300 hover:text-white">
                    Best AI for {task.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
