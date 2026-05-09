import { createCaller } from "@/lib/trpc/server";
import { StatCard } from "@/components/analytics/StatCard";
import { PopularApisChart } from "@/components/analytics/PopularApisChart";
import { AccessRequestTrends } from "@/components/analytics/AccessRequestTrends";
import { SubscriptionsByConsumer } from "@/components/analytics/SubscriptionsByConsumer";
import { DeprecatedConsumersList } from "@/components/analytics/DeprecatedConsumersList";

export default async function AnalyticsDashboardPage() {
  const caller = await createCaller();
  const [overview, popularApis, trends, subscriptionsByConsumer, deprecatedConsumers] = await Promise.all([
    caller.analytics.getOverview(),
    caller.analytics.getPopularApis(),
    caller.analytics.getAccessRequestTrends(),
    caller.analytics.getSubscriptionsByConsumer(),
    caller.analytics.getDeprecatedConsumers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Portal-level metrics and trends</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total APIs" value={overview.totalApis} color="text-sky-400" />
        <StatCard label="Registered Apps" value={overview.totalApps} color="text-violet-400" />
        <StatCard label="Active Subscriptions" value={overview.totalSubscriptions} color="text-emerald-400" />
        <StatCard label="Pending Requests" value={overview.pendingRequests} color="text-amber-400" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PopularApisChart data={popularApis} />
        <SubscriptionsByConsumer data={subscriptionsByConsumer} />
      </div>
      <AccessRequestTrends data={trends} />
      <DeprecatedConsumersList subscriptions={deprecatedConsumers as any} />
    </div>
  );
}
