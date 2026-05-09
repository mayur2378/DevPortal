import { z } from "zod";
import { createTRPCRouter, protectedProcedure, reviewerProcedure, publicProcedure } from "../trpc";

export const governanceRouter = createTRPCRouter({
  getApiScore: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.governanceReview.findMany({
        where: { apiId: input.apiId },
        include: { checklist: true },
      });
      const total = reviews.length;
      const passed = reviews.filter((r) => r.passed).length;
      const score = total > 0 ? Math.round((passed / total) * 100) : null;
      return { score, total, passed, reviews };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    const apis = await ctx.db.api.findMany({
      include: {
        org: true,
        domain: true,
        versions: { take: 1, orderBy: { createdAt: "desc" }, select: { lifecycleStatus: true, maturityScore: true } },
        governanceReviews: { select: { passed: true } },
      },
      orderBy: { name: "asc" },
    });
    return apis.map((api) => {
      const total = api.governanceReviews.length;
      const passed = api.governanceReviews.filter((r) => r.passed).length;
      const score = total > 0 ? Math.round((passed / total) * 100) : null;
      return { ...api, governanceScore: score };
    });
  }),

  getChecklistItems: publicProcedure.query(({ ctx }) =>
    ctx.db.governanceChecklist.findMany({ orderBy: { name: "asc" } })
  ),

  submitReview: reviewerProcedure
    .input(z.object({
      apiId: z.string(),
      checklistId: z.string(),
      passed: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.governanceReview.create({
        data: { ...input, reviewerId: ctx.session.user.id },
      })
    ),
});
