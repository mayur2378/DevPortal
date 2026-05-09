import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LifecycleTimeline } from "@/components/lifecycle/LifecycleTimeline";
import { ChangelogPanel } from "@/components/lifecycle/ChangelogPanel";
import { ConsumerImpactTable } from "@/components/lifecycle/ConsumerImpactTable";
import { DeprecationBanner } from "@/components/lifecycle/DeprecationBanner";
import { LifecycleStatusForm } from "@/components/lifecycle/LifecycleStatusForm";

interface Props {
  params: { apiId: string };
}

export default async function LifecycleDetailPage({ params }: Props) {
  const caller = await createCaller();

  const [api, versions, consumers, events] = await Promise.allSettled([
    caller.api.getById({ id: params.apiId }),
    caller.lifecycle.getVersionHistory({ apiId: params.apiId }),
    caller.lifecycle.getConsumerImpact({ apiId: params.apiId }),
    caller.lifecycle.getEvents({ apiId: params.apiId }),
  ]);

  if (api.status === "rejected" || versions.status === "rejected") notFound();

  const apiData = api.value;
  const versionList = versions.value;
  const consumerList = consumers.status === "fulfilled" ? consumers.value : [];
  const eventList = events.status === "fulfilled" ? events.value : [];

  if (versionList.length === 0) notFound();

  const latestVersion = versionList[0];
  const isDeprecated = latestVersion.lifecycleStatus === "DEPRECATED";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/lifecycle" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Lifecycle Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">{apiData.name}</h1>
        <p className="text-slate-400 text-sm mt-1">{apiData.org?.name}</p>
      </div>

      {isDeprecated && (
        <DeprecationBanner
          apiName={apiData.name}
          retirementDate={latestVersion.retirementDate}
        />
      )}

      <div>
        <h2 className="text-base font-semibold text-white mb-3">Current Status</h2>
        <LifecycleTimeline currentStatus={latestVersion.lifecycleStatus} />
      </div>

      <LifecycleStatusForm
        versions={versionList.map((v) => ({ id: v.id, version: v.version, lifecycleStatus: v.lifecycleStatus }))}
        apiId={params.apiId}
      />

      <div>
        <h2 className="text-base font-semibold text-white mb-3">
          Active Consumers <span className="text-slate-500 font-normal text-sm">({consumerList.length})</span>
        </h2>
        <ConsumerImpactTable subscriptions={consumerList as any} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-white mb-3">Version History</h2>
        <ChangelogPanel versions={versionList} />
      </div>

      {eventList.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Activity Log</h2>
          <div className="space-y-2">
            {eventList.map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 text-sm">
                <span className="text-slate-500 text-xs mt-0.5 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleDateString()}
                </span>
                <span className="text-slate-300">{e.notes}</span>
                {e.actor && <span className="text-slate-500 text-xs ml-auto">by {e.actor.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
