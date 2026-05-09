import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  _count: { select: { memberships: true, apis: true } },
};

export const adminRouter = createTRPCRouter({
  org: createTRPCRouter({
    create: adminProcedure
      .input(z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/) }))
      .mutation(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.create({
          data: {
            ...input,
            memberships: { create: { userId: ctx.session!.user.id, role: "ADMIN" } },
          },
          select: orgSelect,
        });
        return org;
      }),

    listAll: adminProcedure.query(({ ctx }) =>
      ctx.prisma.organization.findMany({ select: orgSelect, orderBy: { name: "asc" } })
    ),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({
          where: { id: input.id },
          include: {
            memberships: {
              include: { user: { select: { id: true, name: true, email: true, role: true } } },
            },
            apis: { select: { id: true, name: true, slug: true, type: true, createdAt: true } },
          },
        });
        if (!org) throw new TRPCError({ code: "NOT_FOUND" });
        return org;
      }),

    update: adminProcedure
      .input(z.object({ id: z.string(), name: z.string().min(2).optional() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.organization.update({
          where: { id: input.id },
          data: { name: input.name },
          select: orgSelect,
        })
      ),

    archive: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({ where: { id: input.id } });
        if (!org) throw new TRPCError({ code: "NOT_FOUND" });
        await ctx.prisma.organization.update({
          where: { id: input.id },
          data: { slug: `${org.slug}-archived-${Date.now()}` },
        });
        return { success: true };
      }),

    setMemberRole: adminProcedure
      .input(z.object({ userId: z.string(), orgId: z.string(), role: z.enum(["MEMBER", "ADMIN"]) }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.orgMembership.upsert({
          where: { userId_orgId: { userId: input.userId, orgId: input.orgId } },
          create: { userId: input.userId, orgId: input.orgId, role: input.role },
          update: { role: input.role },
        })
      ),

    removeMember: adminProcedure
      .input(z.object({ userId: z.string(), orgId: z.string() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.orgMembership.delete({
          where: { userId_orgId: { userId: input.userId, orgId: input.orgId } },
        })
      ),
  }),

  user: createTRPCRouter({
    listAll: adminProcedure.query(({ ctx }) =>
      ctx.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    ),

    setPortalRole: adminProcedure
      .input(z.object({ userId: z.string(), role: z.enum(["USER", "SUPERADMIN"]) }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.user.update({
          where: { id: input.userId },
          data: { role: input.role },
          select: { id: true, role: true },
        })
      ),
  }),
});
