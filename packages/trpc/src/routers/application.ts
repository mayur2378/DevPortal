import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const applicationRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.application.findMany({
      where: { ownerId: ctx.session.user.id },
      include: { subscriptions: { include: { api: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.application.findFirstOrThrow({
        where: { id: input.id, ownerId: ctx.session.user.id },
        include: {
          subscriptions: { include: { api: { include: { org: true } } } },
          subscriptionRequests: { include: { api: { include: { org: true } } }, orderBy: { createdAt: "desc" } },
        },
      })
    ),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2), description: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.application.create({ data: { ...input, ownerId: ctx.session.user.id } })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.application.delete({ where: { id: input.id, ownerId: ctx.session.user.id } })
    ),
});
