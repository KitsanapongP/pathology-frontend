import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DemoLoginForm from "@/components/demo-login-form";
import { demoDestination, demoSnapshot, enterDemo, leaveDemo } from "@/lib/demo-session";
import { portalApi } from "@/lib/portal-api";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "demo"); leaveDemo(); replace.mockClear(); });
afterEach(() => { leaveDemo(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each([
  ["เข้าสู่ระบบ Student / Professor", "workspace", "/portal"],
  ["เข้าสู่ระบบ Admin", "admin", "/portal/admin"],
] as const)("opens the selected role using %s without credentials", (label, role, path) => {
  render(<DemoLoginForm />);
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(demoSnapshot()).toBe(role);
  expect(replace).toHaveBeenCalledWith(path);
  expect(sessionStorage.getItem("pathology:session:v1")).toBeNull();
});

it("bounds role navigation and signs out without removing other data", () => {
  expect(demoDestination("anonymous", "/portal/admin")).toBe("/");
  expect(demoDestination("workspace", "/portal/admin/")).toBe("/portal");
  expect(demoDestination("admin", "/change-password")).toBe("/portal/admin");
  sessionStorage.setItem("unrelated", "keep"); enterDemo("admin"); leaveDemo();
  expect(demoSnapshot()).toBe("anonymous");
  expect(sessionStorage.getItem("unrelated")).toBe("keep");
});

it("never creates a demo session in API mode", () => {
  vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "api");
  expect(() => enterDemo("admin")).toThrow("NEXT_PUBLIC_AUTH_MODE=demo");
  expect(demoSnapshot()).toBe("anonymous");
});

it("prevents service calls in demo mode even when an old real refresh token is stored", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  sessionStorage.setItem("pathology:session:v1", JSON.stringify({ refresh_token: "synthetic-old-token" }));
  expect(() => portalApi.request("users/me")).toThrow("disabled in demo mode");
  expect(fetcher).not.toHaveBeenCalled();
});
