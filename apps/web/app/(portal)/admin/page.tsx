import { createCaller } from "@/lib/trpc/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const caller = await createCaller();
  const [orgs, users] = await Promise.all([
    caller.admin.org.listAll(),
    caller.admin.user.listAll(),
  ]);

  const totalApis = orgs.reduce((sum, o) => sum + o._count.apis, 0);

  const stats = [
    { label: "Organizations", value: orgs.length, href: "/admin/orgs", color: "text-sky-400" },
    { label: "Registered users", value: users.length, href: "/admin/users", color: "text-emerald-400" },
    { label: "Published APIs", value: totalApis, href: "/browse", color: "text-purple-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors"
          >
            <p className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-400 text-sm">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent organizations</h2>
            <Link href="/admin/orgs" className="text-xs text-sky-400 hover:text-sky-300">View all →</Link>
          </div>
          <ul className="space-y-2">
            {orgs.slice(0, 5).map((org) => (
              <li key={org.id}>
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:text-white transition-colors"
                >
                  <span className="text-slate-300">{org.name}</span>
                  <span className="text-slate-500">{org._count.memberships} members · {org._count.apis} APIs</span>
                </Link>
              </li>
            ))}
            {orgs.length === 0 && <li className="text-slate-500 text-sm italic">No organizations yet</li>}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent users</h2>
            <Link href="/admin/users" className="text-xs text-sky-400 hover:text-sky-300">View all →</Link>
          </div>
          <ul className="space-y-2">
            {users.slice(0, 5).map((user) => (
              <li key={user.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-slate-300">{user.name}</p>
                  <p className="text-slate-500 text-xs">{user.email}</p>
                </div>
                {user.role === "SUPERADMIN" && (
                  <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </li>
            ))}
            {users.length === 0 && <li className="text-slate-500 text-sm italic">No users yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
