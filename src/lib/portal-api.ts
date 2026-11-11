"use client";

import { createApiClient, type ApiRequestOptions } from "@/lib/api-client";
import { portalLanguageSnapshot } from "@/lib/portal-preference-store";

let accessToken: string | null = null;

/** The real auth flow supplies the token after login/refresh and clears it on logout. */
export function setApiAccessToken(token: string | null) { accessToken = token; }

// Lazy initialization keeps fixture-only builds usable without live API configuration.
export const portalApi = {
  request<T>(path: string, options?: ApiRequestOptions) { return client().request<T>(path, options); },
  paginated<T>(path: string, options?: ApiRequestOptions) { return client().paginated<T>(path, options); },
};
function client() {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    getAccessToken: () => accessToken,
    getLanguage: portalLanguageSnapshot,
  });
}
