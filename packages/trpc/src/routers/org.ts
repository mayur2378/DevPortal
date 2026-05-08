import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const orgRouter = createTRPCRouter({
  listPublic: publicProcedure.query(({ ctx }) =>
    ctx.prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    })
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { slug: input.slug },
        include: { _count: { select: { apis: true, memberships: true } } },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  join: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already a member." });

      await ctx.prisma.orgMembership.create({
        data: { userId: ctx.session.user.id, orgId: input.orgId },
      });
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.orgMembership.delete({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      return { success: true };
    }),
});
