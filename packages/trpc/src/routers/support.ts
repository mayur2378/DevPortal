import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, adminProcedure } from "../trpc";

export const supportRouter = createTRPCRouter({
  getActiveAnnouncements: publicProcedure.query(({ ctx }) =>
    ctx.db.announcement.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  createAnnouncement: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      expiresAt: z.date().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.announcement.create({ data: { ...input, createdById: ctx.session.user.id } })
    ),

  deactivateAnnouncement: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.announcement.update({ where: { id: input.id }, data: { active: false } })
    ),

  getComments: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.comment.findMany({
        where: { apiId: input.apiId },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    ),

  addComment: protectedProcedure
    .input(z.object({ apiId: z.string(), body: z.string().min(1).max(2000) }))
    .mutation(({ ctx, input }) =>
      ctx.db.comment.create({
        data: { apiId: input.apiId, body: input.body, authorId: ctx.session.user.id },
        include: { author: { select: { id: true, name: true } } },
      })
    ),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.comment.delete({
        where: { id: input.id, authorId: ctx.session.user.id },
      })
    ),

  submitTicket: protectedProcedure
    .input(z.object({ subject: z.string().min(3), body: z.string().min(10) }))
    .mutation(({ ctx, input }) =>
      ctx.db.supportTicket.create({ data: { ...input, submitterId: ctx.session.user.id } })
    ),

  myTickets: protectedProcedure.query(({ ctx }) =>
    ctx.db.supportTicket.findMany({
      where: { submitterId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    })
  ),

  allTickets: adminProcedure.query(({ ctx }) =>
    ctx.db.supportTicket.findMany({
      include: { submitter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),

  updateTicketStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) }))
    .mutation(({ ctx, input }) =>
      ctx.db.supportTicket.update({ where: { id: input.id }, data: { status: input.status } })
    ),
});
