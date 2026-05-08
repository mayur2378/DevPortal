import { createCaller } from "@/lib/trpc/server";
import { PublishWizard } from "@/components/publish/PublishWizard";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PublishPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const caller = await createCaller();
  const profile = await caller.user.profile.get();
  const myOrgs = profile?.memberships.map((m: any) => m.org) ?? [];
  const orgSlugMap = Object.fromEntries(myOrgs.map((o: any) => [o.id, o.slug]));
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Publish an API</h1>
      <PublishWizard orgs={myOrgs} orgSlugMap={orgSlugMap} />
    </div>
  );
}
