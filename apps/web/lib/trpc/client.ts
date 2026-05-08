import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@devportal/trpc";

export const trpc = createTRPCReact<AppRouter>();
