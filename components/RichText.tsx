import Link from "next/link";
import { parseInline } from "@/lib/blog";

const linkClass = "text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:text-emerald-200";

/** Prose with [text](url) links. Internal links stay in the app; external ones open a new tab. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) =>
        !part.url ? (
          <span key={index}>{part.text}</span>
        ) : part.url.startsWith("/") ? (
          <Link key={index} href={part.url} className={linkClass}>
            {part.text}
          </Link>
        ) : (
          <a key={index} href={part.url} target="_blank" rel="noopener" className={linkClass}>
            {part.text}
          </a>
        ),
      )}
    </>
  );
}
