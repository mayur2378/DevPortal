export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";
import { apiRouter } from "./routers/api";
import { apiVersionRouter } from "./routers/apiVersion";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
  apiVersion: apiVersionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
