import { createCaller } from "@/lib/trpc/server";
import { ApiManagementTable } from "@/components/admin/ApiManagementTable";
import Link from "next/link";
export default async function AdminApisPage() {
  const caller = await createCaller();
  const apis = await caller.admin.apiManagement.list();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">API Management</h1>
        <Link href="/admin/import-spec" className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm">Import Spec</Link>
      </div>
      <ApiManagementTable apis={apis as any} />
    </div>
  );
}
