import { createCaller } from "@/lib/trpc/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { OrgMembershipPanel } from "@/components/profile/OrgMembershipPanel";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const caller = await createCaller();
  const [profile, allOrgs] = await Promise.all([
    caller.user.profile.get(),
    caller.org.listPublic(),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-8">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <ProfileForm user={profile} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Organizations</h2>
          <OrgMembershipPanel memberships={profile.memberships as any} allOrgs={allOrgs} />
        </div>
      </div>
    </div>
  );
}
