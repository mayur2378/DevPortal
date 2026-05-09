"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Props { productId: string; productName: string; alreadyRequested: boolean }

export function ProductSubscriptionForm({ productId, productName, alreadyRequested }: Props) {
  const [done, setDone] = useState(false);
  const request = trpc.product.requestSubscription.useMutation({ onSuccess: () => setDone(true) });

  if (alreadyRequested || done) {
    return (
      <div className="p-3 bg-sky-900/20 border border-sky-700/40 rounded-xl text-sm text-sky-300">
        {done ? "✓ Access request submitted" : "You have a pending access request for this product"}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <div>
        <p className="text-white font-semibold text-sm">Request Access to {productName}</p>
        <p className="text-slate-400 text-xs mt-0.5">Requesting product access grants you access to all included APIs upon approval.</p>
      </div>
      {request.error && <p className="text-red-400 text-xs">{request.error.message}</p>}
      <button type="button" onClick={() => request.mutate({ productId })} disabled={request.isPending}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
        {request.isPending ? "Requesting..." : "Request Access"}
      </button>
    </div>
  );
}
