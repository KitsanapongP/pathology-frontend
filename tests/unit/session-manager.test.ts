import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSessionManager, sessionDestination, sessionStorageKey, type SessionTokens } from "@/lib/session-manager";
import { createApiClient } from "@/lib/api-client";

const tokens = (suffix = "1", forced = false): SessionTokens => ({ access_token: `synthetic-access-${suffix}`, refresh_token: `synthetic-refresh-${suffix}`, token_type: "Bearer", expires_in: 300, refresh_expires_in: 1800, must_change_password: forced });
function setup() {
  let next = 1;
  const refresh = vi.fn(async () => tokens(String(++next)));
  const revoke = vi.fn(async () => {});
  const session = createSessionManager({ storage: () => sessionStorage, refresh, revoke });
  return { session, refresh, revoke };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-11T00:00:00Z")); sessionStorage.clear(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); sessionStorage.clear(); });

it("refreshes before expiry and stays authenticated beyond five minutes", async () => {
  const s = setup(); s.session.accept(tokens());
  await vi.advanceTimersByTimeAsync(269_999);
  expect(s.refresh).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(s.refresh).toHaveBeenCalledWith("synthetic-refresh-1");
  await vi.advanceTimersByTimeAsync(90_000);
  expect(await s.session.getAccessToken()).toBe("synthetic-access-2");
  expect(s.session.getSnapshot()).toBe("authenticated");
  const saved = JSON.parse(sessionStorage.getItem(sessionStorageKey)!);
  expect(saved.refresh_token).toBe("synthetic-refresh-2");
  expect(saved).not.toHaveProperty("access_token");
});

it("shares a refresh for simultaneous requests and late 401s", async () => {
  const s = setup(); s.session.accept(tokens());
  let resolve!: (value: SessionTokens) => void;
  s.refresh.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const first = s.session.recover("synthetic-access-1");
  const second = s.session.recover("synthetic-access-1");
  const third = s.session.getAccessToken();
  resolve(tokens("2"));
  expect(await Promise.all([first, second, third])).toEqual(Array(3).fill("synthetic-access-2"));
  expect(await s.session.recover("synthetic-access-1")).toBe("synthetic-access-2");
  expect(s.refresh).toHaveBeenCalledTimes(1);
});

it("restores from refresh storage after reload and preserves the password requirement", async () => {
  const s = setup(); s.session.accept(tokens("1", true));
  const restored = setup();
  restored.refresh.mockResolvedValueOnce({ ...tokens("2"), must_change_password: undefined });
  await Promise.all([restored.session.start(), restored.session.start()]);
  expect(restored.refresh).toHaveBeenCalledTimes(1);
  expect(restored.session.getSnapshot()).toBe("password-required");
  expect(await restored.session.getAccessToken()).toBe("synthetic-access-2");
});

it("clears expired, malformed and rejected refresh sessions", async () => {
  sessionStorage.setItem(sessionStorageKey, "broken json");
  const malformed = setup(); await malformed.session.start();
  expect(malformed.session.getSnapshot()).toBe("anonymous");
  expect(malformed.refresh).not.toHaveBeenCalled();
  const s = setup(); s.session.accept(tokens());
  s.refresh.mockRejectedValueOnce(new Error("expired or revoked"));
  await expect(s.session.recover("synthetic-access-1")).rejects.toThrow();
  expect(s.session.getSnapshot()).toBe("anonymous");
  expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
  expect(await s.session.getAccessToken()).toBeNull();
});

it("does not resurrect a logged-out session when a pending refresh finishes", async () => {
  const s = setup(); s.session.accept(tokens());
  let resolve!: (value: SessionTokens) => void;
  s.refresh.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const pending = s.session.recover("synthetic-access-1");
  await s.session.logout();
  expect(s.revoke).toHaveBeenCalledWith("synthetic-refresh-1", "synthetic-access-1");
  resolve(tokens("late"));
  await expect(pending).rejects.toThrow("Session changed");
  expect(s.session.getSnapshot()).toBe("anonymous");
  expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
});

it("clears local state even when server logout fails, preserving unrelated storage", async () => {
  const s = setup(); s.session.accept(tokens()); sessionStorage.setItem("unrelated", "keep");
  s.revoke.mockRejectedValueOnce(new Error("offline"));
  await expect(s.session.logout()).rejects.toThrow("offline");
  expect(s.session.getSnapshot()).toBe("anonymous");
  expect(sessionStorage.getItem("unrelated")).toBe("keep");
  await vi.advanceTimersByTimeAsync(600_000);
  expect(s.refresh).not.toHaveBeenCalled();
});

it("rechecks expiry after suspended background timers and uses in-memory fallback when storage is blocked", async () => {
  const refresh = vi.fn(async () => tokens("2"));
  const s = createSessionManager({ storage: () => { throw new Error("blocked"); }, refresh, revoke: async () => {} });
  s.accept(tokens());
  vi.setSystemTime(Date.now() + 310_000);
  expect(await s.getAccessToken()).toBe("synthetic-access-2");
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("does not let an old failed refresh clear a newly logged-in session", async () => {
  const s = setup(); s.session.accept(tokens());
  let reject!: (error: Error) => void;
  s.refresh.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  const pending = s.session.recover("synthetic-access-1");
  s.session.accept(tokens("new")); reject(new Error("old failure"));
  await expect(pending).rejects.toThrow();
  expect(await s.session.getAccessToken()).toBe("synthetic-access-new");
});

it("retries HTTP 401 only once, shares refresh, and clears on a second 401", async () => {
  const s = setup(); s.session.accept(tokens());
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
    const good = new Headers(init?.headers).get("Authorization") === "Bearer synthetic-access-2";
    return Response.json(good ? { message: "OK", status: "success", status_code: 200, data: [] } : { message: "Expired", status: "error", status_code: 401, error_code: "auth.expired", request_id: "synthetic" }, { status: good ? 200 : 401 });
  });
  const api = createApiClient({ baseUrl: "http://localhost:9100", getAccessToken: s.session.getAccessToken, getLanguage: () => "th", onUnauthorized: s.session.recover, onAuthenticationFailure: s.session.clear, getSessionGeneration: s.session.getGeneration, fetch: fetcher });
  await Promise.all([api.request("users"), api.request("users")]);
  expect(s.refresh).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(4);
  fetcher.mockImplementation(async () => Response.json({ message: "Unauthorized", status: "error", status_code: 401, error_code: "auth.expired", request_id: "synthetic" }, { status: 401 }));
  await expect(api.request("users")).rejects.toMatchObject({ httpStatus: 401 });
  expect(s.session.getSnapshot()).toBe("anonymous");
  expect(fetcher).toHaveBeenCalledTimes(6);
});

it("does not expose a response from the session that logged out during the request", async () => {
  const s = setup(); s.session.accept(tokens());
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(done => { resolve = done; }));
  const api = createApiClient({ baseUrl: "http://localhost:9100", getAccessToken: s.session.getAccessToken, getLanguage: () => "th", getSessionGeneration: s.session.getGeneration, fetch: fetcher });
  const pending = api.request("users");
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
  await s.session.logout();
  resolve(Response.json({ message: "OK", status: "success", status_code: 200, data: [] }));
  await expect(pending).rejects.toMatchObject({ errorCode: "client.session_changed" });
});

it("guards all pages, including login, while a password change is required", () => {
  for (const path of ["/", "/portal", "/portal/admin", "/portal/examinations/", "/other"]) {
    expect(sessionDestination("password-required", path)).toBe("/change-password");
  }
  expect(sessionDestination("password-required", "/change-password/")).toBeNull();
  expect(sessionDestination("anonymous", "/portal")).toBe("/");
  expect(sessionDestination("authenticated", "/")).toBe("/portal");
});
