import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../trpc";

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
      .input(z.object({ userId: z.string(), role: z.enum(["USER", "SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER", "GOVERNANCE_REVIEWER", "SUPPORT_USER"]) }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.user.update({
          where: { id: input.userId },
          data: { role: input.role },
          select: { id: true, role: true },
        })
      ),
  }),

  domain: createTRPCRouter({
    list: publicProcedure.query(({ ctx }) => ctx.prisma.domain.findMany({ orderBy: { name: "asc" } })),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ ctx, input }) => ctx.db.domain.create({ data: input })),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => ctx.db.domain.delete({ where: { id: input.id } })),
  }),
  tag: createTRPCRouter({
    list: publicProcedure.query(({ ctx }) => ctx.prisma.tag.findMany({ orderBy: { name: "asc" } })),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(({ ctx, input }) => ctx.db.tag.create({ data: input })),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => ctx.db.tag.delete({ where: { id: input.id } })),
  }),

  apiManagement: createTRPCRouter({
    list: adminProcedure.query(({ ctx }) =>
      ctx.db.api.findMany({
        include: { org: true, owner: { select: { id: true, name: true } }, domain: true, tags: { include: { tag: true } }, versions: { take: 1, orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      })
    ),
    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) =>
        ctx.db.api.findUniqueOrThrow({
          where: { id: input.id },
          include: { org: true, owner: { select: { id: true, name: true, email: true } }, domain: true, tags: { include: { tag: true } }, versions: { orderBy: { createdAt: "desc" } } },
        })
      ),
    update: adminProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        visibility: z.enum(["INTERNAL", "PARTNER", "PUBLIC"]).optional(),
        domainId: z.string().optional(),
        businessCapability: z.string().optional(),
        systemOfRecord: z.string().optional(),
        supportContact: z.string().optional(),
        piiIndicator: z.boolean().optional(),
        phiIndicator: z.boolean().optional(),
        dataClassification: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).optional(),
        gatewayRef: z.string().optional(),
        runtimeEndpoint: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.api.update({ where: { id }, data });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => ctx.db.api.delete({ where: { id: input.id } })),
  }),

  subscriptionRequests: createTRPCRouter({
    listAll: adminProcedure.query(({ ctx }) =>
      ctx.db.subscriptionRequest.findMany({
        include: {
          api: { include: { org: true } },
          application: { include: { owner: { select: { id: true, name: true, email: true } } } },
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    ),
  }),
});
