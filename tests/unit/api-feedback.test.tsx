import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ApiErrorNotice, ApiFieldErrors } from "@/components/api-feedback";
import { ApiError, createApiClient } from "@/lib/api-client";
import { portalApi, portalSession } from "@/lib/portal-api";
import { savePortalPreferences } from "@/lib/portal-preference-store";

it("renders validation from an HTTP response beneath its own form field as accessible text", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
    message: "ตรวจสอบข้อมูล", status: "error", status_code: 422, error_code: "users.username_already_exists", request_id: "synthetic",
    errors: { username: ["ชื่อผู้ใช้ซ้ำ", "<script>text only</script>"], password: ["รหัสผ่านสั้นเกินไป"] },
  }, { status: 422 }));
  const api = createApiClient({ baseUrl: "http://localhost:9100", getAccessToken: () => "synthetic", getLanguage: () => "th", fetch: fetcher });
  function Form() {
    const [error, setError] = useState<ApiError | null>(null);
    return <form onSubmit={async event => { event.preventDefault(); setError(null); try { await api.request("users", { body: {} }); } catch (error) { if (error instanceof ApiError) setError(error); } }}>
      <div data-testid="username"><label htmlFor="name">Username</label><input id="name" aria-invalid={!!error?.fieldErrors.username?.length} aria-describedby={error?.fieldErrors.username?.length ? "name-errors" : undefined} /><ApiFieldErrors id="name-errors" field="username" error={error} /></div>
      <div data-testid="password"><label htmlFor="password">Password</label><input id="password" aria-invalid={!!error?.fieldErrors.password?.length} aria-describedby={error?.fieldErrors.password?.length ? "password-errors" : undefined} /><ApiFieldErrors id="password-errors" field="password" error={error} /></div>
      <ApiErrorNotice error={error} /><button>Save</button>
    </form>;
  }
  const { container } = render(<Form />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("ชื่อผู้ใช้ซ้ำ")).toBeVisible();
  expect(within(screen.getByTestId("username")).queryByText("รหัสผ่านสั้นเกินไป")).toBeNull();
  expect(screen.getByLabelText("Username")).toHaveAccessibleDescription("ชื่อผู้ใช้ซ้ำ <script>text only</script>");
  expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("รหัสผ่านสั้นเกินไป");
  expect(container.querySelector("script")).toBeNull();
});

it("uses the portal preference store and current in-memory token in the shared browser client", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9100");
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ message: "OK", status: "success", status_code: 200, data: [] }));
  vi.stubGlobal("fetch", fetcher);
  try {
    portalSession.accept({ access_token: "synthetic-one", refresh_token: "synthetic-refresh", token_type: "Bearer", expires_in: 300, refresh_expires_in: 1800, must_change_password: false });
    savePortalPreferences(JSON.stringify({ language: "th", fontSize: 100 }));
    await portalApi.request("users");
    savePortalPreferences(JSON.stringify({ language: "en", fontSize: 100 }));
    portalSession.accept({ access_token: "synthetic-two", refresh_token: "synthetic-refresh-two", token_type: "Bearer", expires_in: 300, refresh_expires_in: 1800, must_change_password: false });
    await portalApi.request("users");
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("Accept-Language")).toBe("th");
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get("Accept-Language")).toBe("en");
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get("Authorization")).toBe("Bearer synthetic-two");
    portalSession.clear();
    await expect(portalApi.request("users")).rejects.toMatchObject({ errorCode: "client.auth_required" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally { portalSession.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
});
