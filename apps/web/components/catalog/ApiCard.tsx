import Link from "next/link";
import { cn } from "@/lib/utils";
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Api {
  id: string;
  name: string;
  slug: string;
  type: "REST" | "GRAPHQL";
  description?: string | null;
  category?: string | null;
  org: { name: string; slug: string };
  _count: { versions: number };
  createdAt: Date;
}

export function ApiCard({ api }: { api: Api }) {
  const latestVersion = (api as any).versions?.[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all group flex flex-col gap-3">
      <Link href={`/api/${api.org.slug}/${api.slug}`} className="block flex-1">
        <div className="flex items-start justify-between mb-3">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              api.type === "REST"
                ? "bg-sky-950 text-sky-400 border border-sky-800"
                : "bg-purple-950 text-purple-400 border border-purple-800"
            )}
          >
            {api.type === "GRAPHQL" ? "GraphQL" : "REST"}
          </span>
          {api.category && (
            <span className="text-xs text-slate-500">{api.category}</span>
          )}
        </div>

        <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors mb-1">
          {api.name}
        </h3>

        {api.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">{api.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {(api as any).visibility && <VisibilityChip visibility={(api as any).visibility} />}
          {latestVersion?.lifecycleStatus && <StatusBadge status={latestVersion.lifecycleStatus} />}
          {(api as any).domain && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
              {(api as any).domain.name}
            </span>
          )}
          {(api as any).tags?.slice(0, 3).map((at: any) => (
            <span key={at.tag.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
              #{at.tag.name}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          <span>{api.org.name}</span>
          <span>{api._count.versions} version{api._count.versions !== 1 ? "s" : ""}</span>
        </div>
      </Link>

      <div className="border-t border-slate-800 pt-2">
        <Link
          href={`/subscribe/${api.id}`}
          className="block w-full text-center text-xs bg-sky-900/50 hover:bg-sky-800/70 text-sky-400 hover:text-sky-300 border border-sky-800/50 py-1.5 rounded-lg transition-colors font-medium"
        >
          Request Access
        </Link>
      </div>
    </div>
  );
}
