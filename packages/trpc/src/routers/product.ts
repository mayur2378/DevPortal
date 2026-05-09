import { z } from "zod";
import { createTRPCRouter, publicProcedure, ownerProcedure, protectedProcedure } from "../trpc";

export const productRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.aPIProduct.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        apis: { include: { api: { include: { org: true } } } },
        _count: { select: { subscriptionRequests: true } },
      },
      orderBy: { name: "asc" },
    })
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.aPIProduct.findUniqueOrThrow({
        where: { slug: input.slug },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          apis: {
            include: {
              api: {
                include: {
                  org: true,
                  domain: true,
                  versions: { take: 1, orderBy: { createdAt: "desc" }, select: { version: true, lifecycleStatus: true } },
                },
              },
            },
          },
          subscriptionRequests: {
            select: { id: true, status: true, requesterId: true },
          },
        },
      })
    ),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      roadmap: z.string().optional(),
      documentation: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProduct.create({ data: { ...input, ownerId: ctx.session.user.id } })
    ),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      roadmap: z.string().optional(),
      documentation: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.aPIProduct.update({ where: { id, ownerId: ctx.session.user.id }, data });
    }),

  addApi: ownerProcedure
    .input(z.object({ productId: z.string(), apiId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProductItem.create({ data: input })
    ),

  removeApi: ownerProcedure
    .input(z.object({ productId: z.string(), apiId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProductItem.delete({ where: { productId_apiId: input } })
    ),

  requestSubscription: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.productSubscriptionRequest.findFirst({
        where: { productId: input.productId, requesterId: ctx.session.user.id, status: "PENDING" },
      });
      if (existing) throw new Error("Pending request already exists for this product");
      return ctx.db.productSubscriptionRequest.create({
        data: { productId: input.productId, requesterId: ctx.session.user.id },
      });
    }),

  myProductRequests: protectedProcedure.query(({ ctx }) =>
    ctx.db.productSubscriptionRequest.findMany({
      where: { requesterId: ctx.session.user.id },
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),
});
