import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@test_better_t_stack/api/routers/index";

export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
