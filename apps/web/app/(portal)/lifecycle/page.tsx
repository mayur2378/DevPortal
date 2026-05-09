import { createCaller } from "@/lib/trpc/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LifecycleTimeline } from "@/components/lifecycle/LifecycleTimeline";
import Link from "next/link";

export default async function LifecycleDashboardPage() {
  const caller = await createCaller();
  const apis = await caller.lifecycle.getDashboard();
  const deprecated = apis.filter((a) => a.versions[0]?.lifecycleStatus === "DEPRECATED");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Lifecycle Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">Monitor API lifecycle status across the catalog</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {(["ACTIVE", "BETA", "DEPRECATED", "RETIRED"] as const).map((status) => {
          const count = apis.filter((a) => a.versions[0]?.lifecycleStatus === status).length;
          return (
            <div key={status} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-2xl font-black text-white">{count}</p>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>

      {deprecated.length > 0 && (
        <div className="mb-6 p-4 bg-amber-900/10 border border-amber-700/30 rounded-xl">
          <p className="text-amber-300 font-semibold text-sm mb-2">⚠ Deprecated APIs with active consumers</p>
          <div className="space-y-1">
            {deprecated.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{a.name}</span>
                <span className="text-slate-500 text-xs">{a._count.subscriptions} consumer{a._count.subscriptions !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apis.map((api) => (
          <div key={api.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">{api.name}</p>
                <p className="text-slate-400 text-xs">{api.org.name} · {api.owner.name}</p>
              </div>
              <Link href={`/lifecycle/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">
                Manage →
              </Link>
            </div>
            {api.versions[0] && <LifecycleTimeline currentStatus={api.versions[0].lifecycleStatus} />}
          </div>
        ))}
      </div>
    </div>
  );
}
