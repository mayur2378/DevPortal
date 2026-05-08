import { z } from "zod";
import bcrypt from "bcryptjs";
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
});
