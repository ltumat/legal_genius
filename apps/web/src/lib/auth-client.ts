import type { auth } from "@test_better_t_stack/auth";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>()],
});
