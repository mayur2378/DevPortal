import { createTRPCRouter, publicProcedure } from "../trpc";

export const orgRouter = createTRPCRouter({
  listPublic: publicProcedure.query(() => []),
});
