import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { createCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { Suspense } from "react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [caller, session] = await Promise.all([createCaller(), auth()]);
  const orgs = await caller.org.listPublic();
  const role = (session?.user as any)?.role as string | undefined;

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav role={role} />
      <Suspense>
        <Sidebar orgs={orgs} />
      </Suspense>
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
