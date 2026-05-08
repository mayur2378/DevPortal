import "server-only";
import { appRouter, createTRPCContext } from "@devportal/trpc";
import { auth } from "@/lib/auth";

export async function createCaller() {
  const session = await auth();
  const ctx = createTRPCContext(session);
  return appRouter.createCaller(ctx);
}
