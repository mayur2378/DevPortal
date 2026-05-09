"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface User { id: string; name: string; email: string }

export function AddMemberForm({ orgId, allUsers }: { orgId: string; allUsers: User[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [error, setError] = useState("");

  const addMember = trpc.admin.org.setMemberRole.useMutation({
    onSuccess: () => { setUserId(""); setError(""); router.refresh(); },
    onError: (e) => setError(e.message),
  });

  const inputCls = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!userId) return; addMember.mutate({ orgId, userId, role }); }}
      className="mt-4 pt-4 border-t border-slate-800"
    >
      <h3 className="text-sm font-semibold text-white mb-3">Add member</h3>
      <div className="flex gap-2">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} required className={`flex-1 ${inputCls}`}>
          <option value="">Select user…</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")} className={inputCls}>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          type="submit"
          disabled={addMember.isPending || !userId}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          {addMember.isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </form>
  );
}
