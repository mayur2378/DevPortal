import { z } from "zod";
import { createTRPCRouter, protectedProcedure, ownerProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const subscriptionRouter = createTRPCRouter({
  requestAccess: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      apiId: z.string(),
      environment: z.enum(["dev", "test", "stage", "prod"]).default("dev"),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findFirstOrThrow({
        where: { id: input.applicationId, ownerId: ctx.session.user.id },
      });
      const existing = await ctx.db.subscriptionRequest.findFirst({
        where: { applicationId: app.id, apiId: input.apiId, environment: input.environment, status: "PENDING" },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Pending request already exists for this environment" });
      return ctx.db.subscriptionRequest.create({
        data: { applicationId: input.applicationId, apiId: input.apiId, environment: input.environment, comments: input.comments, requesterId: ctx.session.user.id },
      });
    }),

  myRequests: protectedProcedure.query(({ ctx }) =>
    ctx.db.subscriptionRequest.findMany({
      where: { requesterId: ctx.session.user.id },
      include: { api: { include: { org: true } }, application: true },
      orderBy: { createdAt: "desc" },
    })
  ),

  pendingApprovals: ownerProcedure.query(({ ctx }) =>
    ctx.db.subscriptionRequest.findMany({
      where: { status: "PENDING", api: { ownerId: ctx.session.user.id } },
      include: {
        api: { include: { org: true } },
        application: { include: { owner: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  approve: ownerProcedure
    .input(z.object({ requestId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.subscriptionRequest.findFirstOrThrow({
        where: { id: input.requestId, api: { ownerId: ctx.session.user.id } },
      });
      await ctx.db.subscriptionRequest.update({ where: { id: input.requestId }, data: { status: "APPROVED", reviewerId: ctx.session.user.id } });
      await ctx.db.subscription.upsert({
        where: { applicationId_apiId_environment: { applicationId: req.applicationId, apiId: req.apiId, environment: req.environment } },
        create: { applicationId: req.applicationId, apiId: req.apiId, environment: req.environment },
        update: { revokedAt: null },
      });
    }),

  reject: ownerProcedure
    .input(z.object({ requestId: z.string(), comments: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.subscriptionRequest.update({
        where: { id: input.requestId, api: { ownerId: ctx.session.user.id } },
        data: { status: "REJECTED", reviewerId: ctx.session.user.id, comments: input.comments },
      })
    ),
});
