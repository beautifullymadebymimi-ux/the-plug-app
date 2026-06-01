import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import { Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async fetch(url, options) {
          const sessionToken = Platform.OS === "web" ? null : await Auth.getSessionToken();

          return fetch(url, {
            ...options,
            credentials: "include",
            headers: {
              ...(options?.headers || {}),
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
          });
        },
      }),
    ],
  });
}