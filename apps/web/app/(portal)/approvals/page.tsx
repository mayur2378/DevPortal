import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ApprovalCard } from "@/components/onboarding/ApprovalCard";

const APPROVER_ROLES = ["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER"];

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as string | undefined;
  if (!role || !APPROVER_ROLES.includes(role)) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-2">Approval Queue</h1>
        <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <p className="text-slate-400 text-sm">
            You don&apos;t have permission to view the approval queue.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Only API Product Owners, Developers, and Admins can approve subscription requests.
          </p>
        </div>
      </div>
    );
  }

  const caller = await createCaller();
  const pendingRequests = await caller.subscription.pendingApprovals();

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
