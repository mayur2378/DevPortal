import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export default async function MyApisPage() {
  const caller = await createCaller();
  let apis;
  try {
    apis = await caller.api.myApis();
  } catch {
    redirect("/login");
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My APIs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {apis.length} API{apis.length !== 1 ? "s" : ""} published by you
          </p>
        </div>
        <Link
          href="/publish"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Publish API
        </Link>
      </div>

      {apis.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm mb-4">You haven&apos;t published any APIs yet.</p>
          <Link
            href="/publish"
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Publish your first API
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apis.map((api) => {
            const latest = api.versions[0];
            return (
              <div
                key={api.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        api.type === "REST"
                          ? "bg-sky-950 text-sky-400 border border-sky-800"
                          : "bg-purple-950 text-purple-400 border border-purple-800"
                      )}
                    >
                      {api.type === "GRAPHQL" ? "GraphQL" : api.type}
                    </span>
                    {latest?.lifecycleStatus && <StatusBadge status={latest.lifecycleStatus} />}
                  </div>
                  <p className="text-white font-semibold truncate">{api.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {api.org.name} &middot; {api._count.versions} version{api._count.versions !== 1 ? "s" : ""} &middot; {api._count.subscriptions} subscriber{api._count.subscriptions !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/api/${api.org.slug}/${api.slug}`}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View docs
                  </Link>
                  <Link
                    href={`/lifecycle/${api.id}`}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Lifecycle
                  </Link>
                  <Link
                    href={`/governance/${api.id}`}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Governance
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
