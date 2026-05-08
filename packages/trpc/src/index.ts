export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
