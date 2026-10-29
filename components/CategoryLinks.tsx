"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import models from "@/lib/models.json";

export function CategoryLinks() {
  const path = usePathname();
  if (path === "/") return null;

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Categories">
      {Object.values(models.categories).map((category) => (
        <Link
          key={category.slug}
          href={`/${category.slug}`}
          className="text-zinc-400 hover:text-white"
        >
          {category.emoji} {category.display_name}
        </Link>
      ))}
    </nav>
  );
}
