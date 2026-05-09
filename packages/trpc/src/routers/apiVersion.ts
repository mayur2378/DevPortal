import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const versionSelect = {
  id: true,
  version: true,
  specKey: true,
  specType: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  docPages: { orderBy: { order: "asc" as const }, select: { id: true, slug: true, title: true, order: true } },
};

export const apiVersionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        specKey: z.string().optional(),
        specUrl: z.string().url().optional(),
        specType: z.enum(["REST", "GRAPHQL", "ASYNC_API", "EVENT", "WEBHOOK", "SOAP"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findUnique({ where: { id: input.apiId } });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      if (api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.apiVersion.create({
        data: { apiId: input.apiId, version: input.version, specKey: input.specKey, specUrl: input.specUrl, specType: input.specType },
        select: versionSelect,
      });
    }),

  publish: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.prisma.apiVersion.findUnique({
        where: { id: input.versionId },
        include: { api: { select: { ownerId: true } } },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });
      if (version.api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.apiVersion.update({
        where: { id: input.versionId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
        select: versionSelect,
      });
    }),

  listByApi: publicProcedure
    .input(z.object({ apiId: z.string(), includedrafts: z.boolean().optional() }))
    .query(({ ctx, input }) =>
      ctx.prisma.apiVersion.findMany({
        where: {
          apiId: input.apiId,
          ...(!input.includedrafts ? { status: "PUBLISHED" } : {}),
        },
        select: versionSelect,
        orderBy: { createdAt: "desc" },
      })
    ),

  getSpecContent: publicProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const version = await ctx.prisma.apiVersion.findUnique({
        where: { id: input.versionId },
        select: { specKey: true, specUrl: true, specType: true, authMethod: true, rateLimitPolicy: true, slaInfo: true },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });
      return version;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.apiVersion.findUniqueOrThrow({
        where: { id: input.id },
        select: { id: true, version: true, specKey: true, specUrl: true, apiId: true },
      })
    ),

  docPage: createTRPCRouter({
    upsert: protectedProcedure
      .input(
        z.object({
          apiVersionId: z.string(),
          slug: z.string(),
          title: z.string(),
          content: z.string(),
          order: z.number().int().default(0),
        })
      )
      .mutation(({ ctx, input }) =>
        ctx.prisma.docPage.upsert({
          where: { apiVersionId_slug: { apiVersionId: input.apiVersionId, slug: input.slug } },
          create: input,
          update: { title: input.title, content: input.content, order: input.order },
        })
      ),

    list: publicProcedure
      .input(z.object({ apiVersionId: z.string() }))
      .query(({ ctx, input }) =>
        ctx.prisma.docPage.findMany({
          where: { apiVersionId: input.apiVersionId },
          orderBy: { order: "asc" },
        })
      ),
  }),
});
