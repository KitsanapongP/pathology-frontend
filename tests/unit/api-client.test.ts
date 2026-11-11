import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiBaseUrl, apiErrorMessage, createApiClient } from "@/lib/api-client";

const success = { message: "สำเร็จ", status: "success", status_code: 200, data: { id: 1 } };
function setup() {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(success));
  let token: string | null = "first-token";
  let language: "th" | "en" = "th";
  const api = createApiClient({ baseUrl: "http://localhost:9100", getAccessToken: () => token, getLanguage: () => language, fetch: fetcher });
  return { api, fetcher, token: (value: string | null) => { token = value; }, language: (value: "th" | "en") => { language = value; } };
}
afterEach(() => vi.unstubAllGlobals());

describe("API transport", () => {
  it("normalizes local, dev IP and prod origins with exactly one /v1 prefix", () => {
    expect(apiBaseUrl("http://localhost:9100/v1/")).toBe("http://localhost:9100/v1/");
    expect(apiBaseUrl("http://192.0.2.10:9100/v1")).toBe("http://192.0.2.10:9100/v1/");
    expect(apiBaseUrl("http://api.example.test/v1")).toBe("http://api.example.test/v1/");
    for (const url of [undefined, "ftp://api.example.test", "http://user:pass@example.test", "http://example.test/path", "http://example.test?x=1"]) {
      expect(() => apiBaseUrl(url)).toThrow();
    }
  });
  it("reads current credentials and language per request and prevents header overrides", async () => {
    const s = setup();
    expect(await s.api.request("/v1/users?page=2")).toEqual(success);
    expect(s.fetcher.mock.calls[0][0]).toBe("http://localhost:9100/v1/users?page=2");
    expect(new Headers(s.fetcher.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer first-token");
    s.token("refreshed-token"); s.language("en");
    await s.api.request("users", { body: { name: "synthetic" }, headers: { Authorization: "bad", "Accept-Language": "fr" } });
    const init = s.fetcher.mock.calls[1][1]!;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer refreshed-token");
    expect(new Headers(init.headers).get("Accept-Language")).toBe("en");
    expect(init).toMatchObject({ method: "POST", body: '{"name":"synthetic"}', cache: "no-store", credentials: "omit", redirect: "error" });
  });
  it("requires auth unless the caller explicitly opts out for a public endpoint", async () => {
    const s = setup(); s.token(null);
    await expect(s.api.request("users")).rejects.toMatchObject({ errorCode: "client.auth_required" });
    expect(s.fetcher).not.toHaveBeenCalled();
    await s.api.request("auth/login", { auth: false });
    expect(new Headers(s.fetcher.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });
  it("rejects external and escaping paths without sending a token", async () => {
    const s = setup();
    for (const path of ["https://other.test/users", "//other.test", "../users", "%2e%2e/users", "users\\..\\..\\admin", "/v1/../../users", "users#fragment"]) {
      await expect(s.api.request(path)).rejects.toThrow();
    }
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it("leaves multipart boundaries to fetch", async () => {
    const s = setup(); const body = new FormData(); body.set("file", "synthetic");
    await s.api.request("uploads", { body, headers: { "Content-Type": "application/json" } });
    expect(s.fetcher.mock.calls[0][1]?.body).toBe(body);
    expect(new Headers(s.fetcher.mock.calls[0][1]?.headers).has("Content-Type")).toBe(false);
  });
  it("preserves pagination and rejects malformed pagination", async () => {
    const s = setup(); const response = { ...success, data: [], pagination: { total_records: 0, total_pages: 0, current_page: 1, page_size: 20 } };
    s.fetcher.mockResolvedValueOnce(Response.json(response));
    expect(await s.api.paginated("users")).toEqual(response);
    await expect(s.api.paginated("users")).rejects.toMatchObject({ errorCode: "client.invalid_response" });
  });
  it("keeps stable codes, field arrays, and translated backend messages", async () => {
    const s = setup();
    const body = { message: "This translated message can change", status: "error", status_code: 422, error_code: "users.username_already_exists", request_id: "synthetic-422", errors: { username: ["Already used", "Choose another"], password: ["Too short"] } };
    s.fetcher.mockResolvedValue(Response.json(body, { status: 422 }));
    const error = await s.api.request("users").catch(error => error as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ errorCode: body.error_code, fieldErrors: body.errors, message: body.message });
    expect(apiErrorMessage(error as ApiError)).toBe(body.message);
  });
  it("includes a 500 request ID and handles non-JSON nginx errors", async () => {
    const s = setup();
    s.fetcher.mockResolvedValueOnce(new Response("<html>gateway</html>", { status: 502, headers: { "X-Request-ID": "synthetic-gateway" } }));
    const error = await s.api.request("users").catch(error => error as ApiError);
    expect(apiErrorMessage(error as ApiError)).toContain("Request ID: synthetic-gateway");
    s.fetcher.mockResolvedValueOnce(Response.json({ message: "Backend message", status: "error", status_code: 500, error_code: "internal.error", request_id: "synthetic-500" }, { status: 500 }));
    const server = await s.api.request("users").catch(error => error as ApiError);
    expect(apiErrorMessage(server as ApiError)).toBe("Backend message · Request ID: synthetic-500");
  });
  it("adds rate-limit guidance and parses seconds/date Retry-After without retrying writes", async () => {
    const s = setup(); s.language("en");
    s.fetcher.mockResolvedValueOnce(new Response("", { status: 429, headers: { "Retry-After": "30" } }));
    const error = await s.api.request("users", { body: {} }).catch(error => error as ApiError);
    expect(apiErrorMessage(error as ApiError)).toContain("Try again in 30 seconds.");
    expect(s.fetcher).toHaveBeenCalledTimes(1);
    s.fetcher.mockResolvedValueOnce(new Response("", { status: 429, headers: { "Retry-After": new Date(Date.now() + 60_000).toUTCString() } }));
    const dated = await s.api.request("users").catch(error => error as ApiError);
    expect((dated as ApiError).retryAfterSeconds).toBeGreaterThan(58);
  });
  it("normalizes network errors but preserves cancellation", async () => {
    const s = setup(); s.fetcher.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(s.api.request("users")).rejects.toMatchObject({ errorCode: "client.network_error", httpStatus: 0 });
    const controller = new AbortController(); controller.abort();
    s.fetcher.mockRejectedValueOnce(controller.signal.reason);
    await expect(s.api.request("users", { signal: controller.signal })).rejects.toBe(controller.signal.reason);
  });
  it("rejects invalid success payloads rather than treating them as domain data", async () => {
    const s = setup(); s.fetcher.mockResolvedValueOnce(Response.json({ ...success, status_code: 500 }));
    await expect(s.api.request("users")).rejects.toMatchObject({ errorCode: "client.invalid_response" });
  });
});
