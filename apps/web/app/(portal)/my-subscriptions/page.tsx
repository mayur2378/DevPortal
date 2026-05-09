import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    APPROVED: "bg-green-500/20 text-green-400 border-green-500/30",
    REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function MySubscriptionsPage() {
  const caller = await createCaller();
  let requests;
  try {
    requests = await caller.subscription.myRequests();
  } catch {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/browse"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Browse APIs
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm mb-4">No subscription requests yet.</p>
          <Link
            href="/browse"
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Browse APIs to subscribe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{req.api.name}</span>
                  {req.api.org && (
                    <span className="text-slate-500 text-xs">({req.api.org.name})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-400 text-xs">{req.application.name}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-400 text-xs capitalize">{req.environment}</span>
                  {req.comments && (
                    <>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-500 text-xs truncate max-w-xs">{req.comments}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={req.status} />
                <span className="text-slate-600 text-xs">
                  {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
