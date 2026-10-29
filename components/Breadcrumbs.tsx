import Link from "next/link";

export function Breadcrumbs({ crumbs }: { crumbs: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-zinc-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden>›</span> : null}
            {index === crumbs.length - 1 ? (
              <span aria-current="page" className="text-zinc-400">
                {crumb.name}
              </span>
            ) : (
              <Link href={crumb.path} className="hover:text-white">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
