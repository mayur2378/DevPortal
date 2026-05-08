import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@devportal/db";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
        password: z.string().min(8),
        orgIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();

      const existing = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      // Validate that the supplied org IDs actually exist
      let validOrgIds: string[] = [];
      if (input.orgIds.length > 0) {
        const existingOrgs = await ctx.prisma.organization.findMany({
          where: { id: { in: input.orgIds } },
          select: { id: true },
        });
        validOrgIds = existingOrgs.map((o) => o.id);
      }

      try {
        const user = await ctx.prisma.user.create({
          data: {
            email,
            name: input.name,
            passwordHash,
            memberships: {
              create: validOrgIds.map((orgId) => ({ orgId })),
            },
          },
          select: { id: true, email: true, name: true, role: true },
        });
        return user;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists.",
          });
        }
        throw e;
      }
    }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();
      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (!user) return { success: true };

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await ctx.prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      return { success: true, token };
    }),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
      });

      if (!record || record.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await ctx.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await ctx.prisma.passwordResetToken.delete({ where: { token: input.token } });

      return { success: true };
    }),
});
