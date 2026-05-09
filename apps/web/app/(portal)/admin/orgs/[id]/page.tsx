import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { AddMemberForm } from "@/components/admin/AddMemberForm";

export default async function AdminOrgDetailPage({ params }: { params: { id: string } }) {
  const caller = await createCaller();
  const [org, allUsers] = await Promise.all([
    caller.admin.org.getById({ id: params.id }).catch(() => null),
    caller.admin.user.listAll(),
  ]);
  if (!org) notFound();

  const memberIds = new Set(org.memberships.map((m: any) => m.userId));
  const nonMembers = allUsers.filter((u: any) => !memberIds.has(u.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">{org.name}</h1>
      <p className="text-slate-400 text-sm mb-8 font-mono">{org.slug}</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Members ({org.memberships.length})</h2>
          {org.memberships.length === 0 ? <p className="text-slate-500 text-sm italic">No members yet.</p> : (
            <ul className="space-y-2">
              {org.memberships.map((m: any) => (
                <li key={m.userId} className="flex items-center justify-between py-2 text-sm border-b border-slate-800 last:border-0">
                  <div><p className="text-slate-300">{m.user.name}</p><p className="text-slate-500 text-xs">{m.user.email}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${m.role === "ADMIN" ? "bg-amber-950 text-amber-400 border-amber-800" : "bg-slate-800 text-slate-400 border-slate-700"}`}>{m.role}</span>
                </li>
              ))}
            </ul>
          )}
          {nonMembers.length > 0 && <AddMemberForm orgId={org.id} allUsers={nonMembers} />}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">APIs ({org.apis.length})</h2>
          {org.apis.length === 0 ? <p className="text-slate-500 text-sm italic">No APIs published yet.</p> : (
            <ul className="space-y-2">
              {org.apis.map((api: any) => (
                <li key={api.id} className="flex items-center justify-between py-2 text-sm border-b border-slate-800 last:border-0">
                  <span className="text-slate-300">{api.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${api.type === "REST" ? "bg-sky-950 text-sky-400" : "bg-purple-950 text-purple-400"}`}>{api.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
