import { prisma } from "@devportal/db";
import type { Session } from "next-auth";

export interface TRPCContext {
  session: Session | null;
  prisma: typeof prisma;
}

export function createTRPCContext(session: Session | null): TRPCContext {
  return { session, prisma };
}
