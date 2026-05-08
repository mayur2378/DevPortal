"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  orgSlug: string;
  apiSlug: string;
  version: string;
}

const tabs = [
  { label: "Docs", path: "docs" },
  { label: "Reference", path: "reference" },
  { label: "Try It", path: "try" },
];

export function ApiTabs({ orgSlug, apiSlug, version }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-800 mb-6">
      {tabs.map((tab) => {
        const href = `/api/${orgSlug}/${apiSlug}/${version}/${tab.path}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.path}
            href={href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
