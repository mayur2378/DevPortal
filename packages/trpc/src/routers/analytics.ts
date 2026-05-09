import { createTRPCRouter, publicProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const [totalApis, totalApps, totalSubscriptions, pendingRequests] = await Promise.all([
      ctx.db.api.count(),
      ctx.db.application.count(),
      ctx.db.subscription.count({ where: { revokedAt: null } }),
      ctx.db.subscriptionRequest.count({ where: { status: "PENDING" } }),
    ]);
    return { totalApis, totalApps, totalSubscriptions, pendingRequests };
  }),

  getPopularApis: publicProcedure.query(async ({ ctx }) => {
    const metrics = await ctx.db.usageMetric.groupBy({
      by: ["apiId"],
      _sum: { calls: true, consumers: true, docViews: true },
      orderBy: { _sum: { calls: "desc" } },
      take: 10,
    });
    const apiIds = metrics.map((m) => m.apiId);
    const apis = await ctx.db.api.findMany({
      where: { id: { in: apiIds } },
      select: { id: true, name: true, type: true },
    });
    const apiMap = Object.fromEntries(apis.map((a) => [a.id, a]));
    return metrics.map((m) => ({
      name: apiMap[m.apiId]?.name ?? m.apiId,
      type: apiMap[m.apiId]?.type ?? "REST",
      calls: m._sum.calls ?? 0,
      consumers: m._sum.consumers ?? 0,
      docViews: m._sum.docViews ?? 0,
    }));
  }),

  getMonthlyTrend: publicProcedure.query(async ({ ctx }) => {
    const metrics = await ctx.db.usageMetric.groupBy({
      by: ["month"],
      _sum: { calls: true, consumers: true },
      orderBy: { month: "asc" },
    });
    return metrics.map((m) => ({
      month: m.month,
      calls: m._sum.calls ?? 0,
      consumers: m._sum.consumers ?? 0,
    }));
  }),

  getSubscriptionsByConsumer: publicProcedure.query(async ({ ctx }) => {
    const apps = await ctx.db.application.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { subscriptions: { _count: "desc" } },
      take: 20,
    });
    return apps.map((a) => ({
      name: a.name,
      owner: a.owner.name,
      subscriptions: a._count.subscriptions,
    }));
  }),

  getAccessRequestTrends: publicProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db.subscriptionRequest.findMany({
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const byMonth: Record<string, { approved: number; rejected: number; pending: number }> = {};
    for (const r of requests) {
      const month = r.createdAt.toISOString().slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { approved: 0, rejected: 0, pending: 0 };
      if (r.status === "APPROVED") byMonth[month].approved++;
      else if (r.status === "REJECTED") byMonth[month].rejected++;
      else byMonth[month].pending++;
    }
    return Object.entries(byMonth).map(([month, counts]) => ({ month, ...counts }));
  }),

  getDeprecatedConsumers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.subscription.findMany({
      where: {
        revokedAt: null,
        api: { versions: { some: { lifecycleStatus: "DEPRECATED" } } },
      },
      include: {
        api: { select: { id: true, name: true } },
        application: { include: { owner: { select: { id: true, name: true, email: true } } } },
      },
    });
  }),
});
