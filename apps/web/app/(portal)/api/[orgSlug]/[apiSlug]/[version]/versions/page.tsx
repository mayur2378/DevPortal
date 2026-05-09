import { createCaller } from "@/lib/trpc/server";
import { ChangelogPanel } from "@/components/lifecycle/ChangelogPanel";
import { ConsumerImpactTable } from "@/components/lifecycle/ConsumerImpactTable";
import { notFound } from "next/navigation";

export default async function ApiVersionsPage({ params }: { params: { orgSlug: string; apiSlug: string; version: string } }) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) return notFound();

  const [versions, consumers] = await Promise.all([
    caller.lifecycle.getVersionHistory({ apiId: api.id }),
    caller.lifecycle.getConsumerImpact({ apiId: api.id }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Version History — {api.name}</h1>
        <p className="text-slate-400 text-sm mt-1">{versions.length} version{versions.length !== 1 ? "s" : ""}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Changelog</h2>
        <ChangelogPanel versions={versions as any} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Active Consumers ({consumers.length})</h2>
        <ConsumerImpactTable subscriptions={consumers as any} />
      </div>
    </div>
  );
}
