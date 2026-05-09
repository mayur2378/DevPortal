export { createTRPCContext } from "./context";
export {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  ownerProcedure,
  reviewerProcedure,
} from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";
import { apiRouter } from "./routers/api";
import { apiVersionRouter } from "./routers/apiVersion";
import { adminRouter } from "./routers/admin";
import { applicationRouter } from "./routers/application";
import { subscriptionRouter } from "./routers/subscription";
import { governanceRouter } from "./routers/governance";
import { lifecycleRouter } from "./routers/lifecycle";
import { productRouter } from "./routers/product";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
  apiVersion: apiVersionRouter,
  admin: adminRouter,
  application: applicationRouter,
  subscription: subscriptionRouter,
  governance: governanceRouter,
  lifecycle: lifecycleRouter,
  product: productRouter,
});

export type AppRouter = typeof appRouter;
