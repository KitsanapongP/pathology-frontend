import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import LoginForm from "@/components/login-form";
import { ApiError } from "@/lib/api-client";
import { clearLoginNotice } from "@/lib/login-notice";

const mocks = vi.hoisted(() => ({ request: vi.fn(), accept: vi.fn(), replace: vi.fn(), generation: vi.fn(() => 0) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/portal-api", () => ({ portalApi: { request: mocks.request }, portalSession: { accept: mocks.accept, getGeneration: mocks.generation } }));
beforeEach(() => { mocks.request.mockReset(); mocks.accept.mockReset(); mocks.replace.mockClear(); mocks.generation.mockReset().mockReturnValue(0); clearLoginNotice(); });

function fill() {
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: " synthetic-user " } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "synthetic-password" } });
}
const tokens = { access_token: "synthetic-access", refresh_token: "synthetic-refresh", token_type: "Bearer", expires_in: 300, refresh_expires_in: 1800, must_change_password: false };

it("keeps password visibility reversible without changing the entered value", () => {
  render(<LoginForm />);
  const password = screen.getByLabelText("รหัสผ่าน");
  fireEvent.change(password, { target: { value: "synthetic-test-value" } });
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue("synthetic-test-value");
  fireEvent.click(screen.getByRole("button", { name: "ซ่อนรหัสผ่าน" }));
  expect(password).toHaveAttribute("type", "password");
});

it("validates required fields without submitting or allowing a demo role bypass", () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("กรุณาระบุชื่อผู้ใช้");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("กรุณาระบุรหัสผ่าน");
  expect(mocks.request).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Admin|Student|SSO/ })).toBeNull();
});

it("uses auth.invalid_credentials regardless of the translated backend message", async () => {
  mocks.request.mockRejectedValue(new ApiError({ message: "Backend text can change", status: "error", status_code: 401, error_code: "auth.invalid_credentials", request_id: "synthetic" }, 401, "th"));
  render(<LoginForm />); fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  expect(mocks.accept).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("blocks values over Swagger's limits without submitting or truncating the password", () => {
  render(<LoginForm />);
  const username = "u".repeat(101);
  const password = "p".repeat(257);
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("รหัสผ่านต้องไม่เกิน 256 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveValue(password);
  expect(mocks.request).not.toHaveBeenCalled();
});

it.each(["x", "😀"])("allows exact Swagger character boundaries using %s", async character => {
  mocks.request.mockResolvedValue({ data: tokens });
  render(<LoginForm />);
  const username = character.repeat(100);
  const password = character.repeat(256);
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
  expect(mocks.request).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: { username, password } }));
});

it.each([false, true])("hands the token set to session and routes must_change_password=%s correctly", async forced => {
  const data = { ...tokens, must_change_password: forced };
  mocks.request.mockResolvedValue({ data });
  render(<LoginForm />); fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith(data, expect.any(Number)));
  expect(mocks.request).toHaveBeenCalledWith("auth/login", expect.objectContaining({ method: "POST", auth: false, body: { username: "synthetic-user", password: "synthetic-password" } }));
  expect(mocks.replace).toHaveBeenCalledWith(forced ? "/change-password" : "/portal");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveValue("");
});

it("keeps field validation messages with the corresponding field", async () => {
  mocks.request.mockRejectedValue(new ApiError({ message: "Invalid values", status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic", errors: { username: ["Synthetic username validation"], password: ["Synthetic password validation"] } }, 422, "th"));
  render(<LoginForm />); fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("Synthetic username validation"));
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("Synthetic password validation");
});

it("prevents duplicate login and does not establish a session after unmount", async () => {
  let resolve!: (value: unknown) => void;
  mocks.request.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { unmount } = render(<LoginForm />); fill();
  fireEvent.submit(screen.getByRole("form")); fireEvent.submit(screen.getByRole("form"));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  const signal = mocks.request.mock.calls[0][1].signal;
  unmount(); expect(signal.aborted).toBe(true);
  resolve({ data: tokens });
  await Promise.resolve();
  expect(mocks.accept).not.toHaveBeenCalled();
});
