import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SubscriptionRequestForm } from "@/components/onboarding/SubscriptionRequestForm";

interface Props {
  params: { apiId: string };
}

export default async function SubscribePage({ params }: Props) {
  const caller = await createCaller();

  let api;
  let apps;
  try {
    [api, apps] = await Promise.all([
      caller.api.getById({ id: params.apiId }),
      caller.application.list(),
    ]);
  } catch {
    redirect("/login");
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href="/browse"
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← API Catalog
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1">Request Access</h1>
      <p className="text-slate-400 text-sm mb-6">
        Requesting access to{" "}
        <span className="text-white font-medium">{api.name}</span>
        {api.org && (
          <span className="text-slate-500"> by {api.org.name}</span>
        )}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <SubscriptionRequestForm
          apiId={params.apiId}
          apiName={api.name}
          apps={apps.map((a) => ({ id: a.id, name: a.name }))}
        />
      </div>
    </div>
  );
}
