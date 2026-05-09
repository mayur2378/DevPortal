import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

const apiSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  category: true,
  org: { select: { id: true, name: true, slug: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { versions: true } },
  createdAt: true,
};

export const apiRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        orgSlug: z.string().optional(),
        type: z.enum(["REST", "GRAPHQL"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(({ ctx, input }) =>
      ctx.prisma.api.findMany({
        where: {
          ...(input?.orgSlug ? { org: { slug: input.orgSlug } } : {}),
          ...(input?.type ? { type: input.type } : {}),
          ...(input?.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { description: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
          versions: { some: { status: "PUBLISHED" } },
        },
        select: apiSelect,
        orderBy: { createdAt: "desc" },
      })
    ),

  getBySlug: publicProcedure
    .input(z.object({ orgSlug: z.string(), apiSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findFirst({
        where: { slug: input.apiSlug, org: { slug: input.orgSlug } },
        select: {
          ...apiSelect,
          versions: {
            where: { status: "PUBLISHED" },
            select: { id: true, version: true, status: true, publishedAt: true },
            orderBy: { publishedAt: "desc" },
          },
        },
      });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      return api;
    }),

  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(2),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        type: z.enum(["REST", "GRAPHQL"]),
        description: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You must be an org member to publish APIs." });

      return ctx.prisma.api.create({
        data: { ...input, ownerId: ctx.session.user.id },
        select: apiSelect,
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.api.findUniqueOrThrow({
        where: { id: input.id },
        include: { org: true, owner: { select: { id: true, name: true, email: true } } },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ apiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findUnique({ where: { id: input.apiId } });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      if (api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.prisma.api.delete({ where: { id: input.apiId } });
      return { success: true };
    }),
});
