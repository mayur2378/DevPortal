import { z } from "zod";
import { createTRPCRouter, publicProcedure, ownerProcedure } from "../trpc";

export const lifecycleRouter = createTRPCRouter({
  getDashboard: publicProcedure.query(({ ctx }) =>
    ctx.db.api.findMany({
      include: {
        org: true,
        domain: true,
        owner: { select: { id: true, name: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, version: true, lifecycleStatus: true, retirementDate: true, createdAt: true },
        },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { name: "asc" },
    })
  ),

  getVersionHistory: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.apiVersion.findMany({
        where: { apiId: input.apiId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, version: true, lifecycleStatus: true, status: true,
          changelog: true, releaseNotes: true, maturityScore: true,
          retirementDate: true, publishedAt: true, createdAt: true,
        },
      })
    ),

  getConsumerImpact: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.subscription.findMany({
        where: { apiId: input.apiId, revokedAt: null },
        include: {
          application: { include: { owner: { select: { id: true, name: true, email: true } } } },
        },
      })
    ),

  getEvents: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.lifecycleEvent.findMany({
        where: { apiId: input.apiId },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    ),

  updateVersionLifecycle: ownerProcedure
    .input(z.object({
      versionId: z.string(),
      lifecycleStatus: z.enum(["DRAFT", "BETA", "ACTIVE", "DEPRECATED", "RETIRED"]),
      retirementDate: z.date().optional(),
      changelog: z.string().optional(),
      releaseNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { versionId, ...data } = input;
      const version = await ctx.db.apiVersion.update({ where: { id: versionId }, data });
      await ctx.db.lifecycleEvent.create({
        data: {
          apiId: version.apiId,
          actorId: ctx.session.user.id,
          type: "STATUS_CHANGED",
          notes: `Version ${version.version} moved to ${input.lifecycleStatus}`,
        },
      });
      return version;
    }),
});
