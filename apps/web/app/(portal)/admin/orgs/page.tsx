import { createCaller } from "@/lib/trpc/server";
import { OrgCreateForm } from "@/components/admin/OrgCreateForm";
import { OrgTable } from "@/components/admin/OrgTable";

export default async function AdminOrgsPage() {
  const caller = await createCaller();
  const orgs = await caller.admin.org.listAll();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Organizations</h1>
      <OrgCreateForm />
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <OrgTable orgs={orgs as any} />
      </div>
    </div>
  );
}
