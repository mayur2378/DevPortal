import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  profile: createTRPCRouter({
    get: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          memberships: {
            include: { org: { select: { id: true, name: true, slug: true } } },
          },
        },
      })
    ),

    update: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { ...input },
          select: { id: true, email: true, name: true, role: true },
        })
      ),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { passwordHash: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid)
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });

        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { passwordHash },
        });
        return { success: true };
      }),
  }),
});
