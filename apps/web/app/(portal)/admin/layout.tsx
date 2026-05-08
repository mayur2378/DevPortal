import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if ((session?.user as any)?.role !== "SUPERADMIN") {
    redirect("/browse");
  }

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-slate-800 flex items-center gap-3">
        <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-semibold">
          Super Admin
        </span>
        <nav className="flex gap-4 text-sm">
          <a href="/admin" className="text-slate-400 hover:text-white transition-colors">Dashboard</a>
          <a href="/admin/orgs" className="text-slate-400 hover:text-white transition-colors">Organizations</a>
          <a href="/admin/users" className="text-slate-400 hover:text-white transition-colors">Users</a>
        </nav>
      </div>
      {children}
    </div>
  );
}
