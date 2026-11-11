"use client";

import { createApiClient, type ApiRequestOptions } from "@/lib/api-client";
import { portalLanguageSnapshot } from "@/lib/portal-preference-store";
import { createSessionManager, type SessionTokens } from "@/lib/session-manager";
import { demoSnapshot, isDemoAuth } from "@/lib/demo-session";

function requireApiAuth() {
  const state = portalSession.getSnapshot();
  const realSession = state === "authenticated" || state === "password-required";
  if (isDemoAuth() && !realSession && ["workspace", "admin"].includes(demoSnapshot())) throw new Error("Service HTTP calls are disabled in demo mode. Sign out of the preview and use the login form to connect to the backend.");
}

function transport(getAccessToken: () => string | null | Promise<string | null>) {
  requireApiAuth();
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    getAccessToken, getLanguage: portalLanguageSnapshot,
  });
}

export const portalSession = createSessionManager({
  storage: () => sessionStorage,
  refresh: async refreshToken => (await transport(() => null).request<SessionTokens>("auth/refresh", {
    method: "POST", auth: false, body: { refresh_token: refreshToken }, signal: AbortSignal.timeout(15_000),
  })).data,
  revoke: (refreshToken, accessToken) => transport(() => accessToken).request("auth/logout", {
    method: "POST", auth: !!accessToken, body: { refresh_token: refreshToken }, signal: AbortSignal.timeout(10_000),
  }),
});

function client() {
  requireApiAuth();
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    getAccessToken: portalSession.getAccessToken, getLanguage: portalLanguageSnapshot,
    onUnauthorized: portalSession.recover,
    onAuthenticationFailure: portalSession.clear,
    getSessionGeneration: portalSession.getGeneration,
  });
}
export const portalApi = {
  request<T>(path: string, options?: ApiRequestOptions) { return client().request<T>(path, options); },
  paginated<T>(path: string, options?: ApiRequestOptions) { return client().paginated<T>(path, options); },
};
