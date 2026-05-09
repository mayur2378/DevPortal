"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Request {
  id: string;
  environment: string;
  comments: string | null;
  createdAt: Date;
  api: { id: string; name: string; org: { name: string } | null };
  application: { id: string; name: string; owner: { name: string | null; email: string } };
  requester: { id: string; name: string | null; email: string };
}

interface Props {
  request: Request;
}

export function ApprovalCard({ request }: Props) {
  const router = useRouter();
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState("");

  const approve = trpc.subscription.approve.useMutation({
    onSuccess: () => router.refresh(),
    onError: (e) => setError(e.message),
  });

  const reject = trpc.subscription.reject.useMutation({
    onSuccess: () => router.refresh(),
    onError: (e) => setError(e.message),
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{request.api.name}</span>
            {request.api.org && (
              <span className="text-slate-500 text-xs">({request.api.org.name})</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span>App: <span className="text-slate-300">{request.application.name}</span></span>
            <span className="text-slate-600">·</span>
            <span>Env: <span className="text-slate-300 capitalize">{request.environment}</span></span>
          </div>
        </div>
        <span className="text-slate-500 text-xs">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="text-xs text-slate-400 space-y-0.5">
        <p>Requester: <span className="text-slate-300">{request.requester.name ?? request.requester.email}</span></p>
        <p>Owner: <span className="text-slate-300">{request.application.owner.name ?? request.application.owner.email}</span></p>
        {request.comments && (
          <p className="mt-2 text-slate-400 italic">"{request.comments}"</p>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {showRejectInput ? (
        <div className="space-y-2">
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={2}
            placeholder="Reason for rejection (optional)"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => reject.mutate({ requestId: request.id, comments: rejectNotes || undefined })}
              disabled={reject.isPending}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-1.5 rounded-lg text-sm"
            >
              {reject.isPending ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectInput(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => approve.mutate({ requestId: request.id })}
            disabled={approve.isPending}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-1.5 rounded-lg text-sm"
          >
            {approve.isPending ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setShowRejectInput(true)}
            className="flex-1 bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-300 font-semibold py-1.5 rounded-lg text-sm transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
