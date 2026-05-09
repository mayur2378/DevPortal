import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "SUPERADMIN") throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const ownerProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (!role || !["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER"].includes(role)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

export const reviewerProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (!role || !["SUPERADMIN", "GOVERNANCE_REVIEWER"].includes(role)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});
