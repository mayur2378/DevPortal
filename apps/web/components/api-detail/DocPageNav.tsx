import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocPage { id: string; slug: string; title: string; order: number }
interface Props { pages: DocPage[]; currentSlug: string; orgSlug: string; apiSlug: string; version: string }

export function DocPageNav({ pages, currentSlug, orgSlug, apiSlug, version }: Props) {
  return (
    <nav className="w-48 shrink-0">
      <ul className="space-y-0.5">
        {pages.map((page) => (
          <li key={page.id}>
            <Link
              href={`/api/${orgSlug}/${apiSlug}/${version}/docs/${page.slug}`}
              className={cn(
                "block px-3 py-1.5 rounded-md text-sm transition-colors",
                currentSlug === page.slug ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {page.title}
            </Link>
          </li>
        ))}
        {pages.length === 0 && <li className="text-slate-600 text-sm italic px-3 py-1.5">No pages yet</li>}
      </ul>
    </nav>
  );
}
