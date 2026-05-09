import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import { ApprovalCard } from "@/components/onboarding/ApprovalCard";

export default async function ApprovalsPage() {
  const caller = await createCaller();
  let pendingRequests;
  try {
    pendingRequests = await caller.subscription.pendingApprovals();
  } catch {
    redirect("/login");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Approval Queue</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">No pending approval requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <ApprovalCard key={req.id} request={req as any} />
          ))}
        </div>
      )}
    </div>
  );
}
