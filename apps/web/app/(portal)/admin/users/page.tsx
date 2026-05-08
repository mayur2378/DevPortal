import { createCaller } from "@/lib/trpc/server";
import { UserTable } from "@/components/admin/UserTable";

export default async function AdminUsersPage() {
  const caller = await createCaller();
  const users = await caller.admin.user.listAll();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <UserTable users={users as any} />
      </div>
    </div>
  );
}
