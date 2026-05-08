"use client";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface User { id: string; name: string; email: string; role: "USER" | "SUPERADMIN"; createdAt: Date; _count: { memberships: number } }

export function UserTable({ users }: { users: User[] }) {
  const router = useRouter();
  const setRole = trpc.admin.user.setPortalRole.useMutation({ onSuccess: () => router.refresh() });
  if (users.length === 0) return <p className="text-slate-500 text-sm italic">No users yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800 text-left">
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">User</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Email</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Orgs</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Portal role</th>
          <th className="pb-2 text-xs font-medium text-slate-500">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-3 pr-6 text-slate-300 font-medium">{user.name}</td>
            <td className="py-3 pr-6 text-slate-400 text-xs">{user.email}</td>
            <td className="py-3 pr-6 text-slate-400">{user._count.memberships}</td>
            <td className="py-3 pr-6">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${user.role === "SUPERADMIN" ? "bg-amber-950 text-amber-400 border-amber-800" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                {user.role === "SUPERADMIN" ? "Super Admin" : "User"}
              </span>
            </td>
            <td className="py-3">
              {user.role === "USER" ? (
                <button onClick={() => { if (confirm(`Promote ${user.name} to Super Admin?`)) setRole.mutate({ userId: user.id, role: "SUPERADMIN" }); }} disabled={setRole.isPending} className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50">Make admin</button>
              ) : (
                <button onClick={() => { if (confirm(`Demote ${user.name} to regular user?`)) setRole.mutate({ userId: user.id, role: "USER" }); }} disabled={setRole.isPending} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">Remove admin</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
