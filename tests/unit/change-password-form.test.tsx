import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChangePasswordForm from "@/components/change-password-form";
import { ApiError } from "@/lib/api-client";
import { clearLoginNotice, hasPasswordChangedNotice } from "@/lib/login-notice";

const mocks = vi.hoisted(() => ({ request: vi.fn(), clear: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/portal-api", () => ({ portalApi: { request: mocks.request }, portalSession: { clear: mocks.clear } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
beforeEach(() => { mocks.request.mockReset(); mocks.clear.mockClear(); mocks.replace.mockClear(); clearLoginNotice(); });

function fill(oldPassword = "synthetic-old", newPassword = "synthetic-new", confirmation = newPassword) {
  fireEvent.change(screen.getByLabelText("รหัสผ่านเดิม"), { target: { value: oldPassword } });
  fireEvent.change(screen.getByLabelText("รหัสผ่านใหม่", { exact: true }), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText("ยืนยันรหัสผ่านใหม่"), { target: { value: confirmation } });
}
it("blocks missing, short and mismatching values before any network call", () => {
  render(<ChangePasswordForm />);
  fill("", "short", "different");
  fireEvent.click(screen.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }));
  expect(screen.getByLabelText("รหัสผ่านเดิม")).toHaveAccessibleDescription("กรุณาระบุรหัสผ่านเดิม");
  expect(screen.getByLabelText("รหัสผ่านใหม่", { exact: true })).toHaveAccessibleDescription("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
  expect(screen.getByLabelText("ยืนยันรหัสผ่านใหม่")).toHaveAccessibleDescription("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
  expect(mocks.request).not.toHaveBeenCalled();
});
it("maps users.wrong_password onto the old-password field by code", async () => {
  mocks.request.mockRejectedValue(new ApiError({ message: "Backend translated text", status: "error", status_code: 400, error_code: "users.wrong_password", request_id: "synthetic" }, 400, "th"));
  render(<ChangePasswordForm />); fill();
  fireEvent.click(screen.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }));
  await waitFor(() => expect(screen.getByLabelText("รหัสผ่านเดิม")).toHaveAccessibleDescription("รหัสผ่านเดิมไม่ถูกต้อง"));
  expect(screen.getByText("Backend translated text")).toBeVisible();
  expect(mocks.clear).not.toHaveBeenCalled();
});
it("sends only contract fields, blocks duplicate submit, and ends the session with a login notice", async () => {
  let resolve!: (value: unknown) => void;
  mocks.request.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<ChangePasswordForm />); fill();
  const form = screen.getByRole("form"); fireEvent.submit(form); fireEvent.submit(form);
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(mocks.request).toHaveBeenCalledWith("users/me/password", expect.objectContaining({ method: "PUT", body: { old_password: "synthetic-old", new_password: "synthetic-new" } }));
  resolve({});
  await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
  expect(mocks.replace).toHaveBeenCalledWith("/");
  expect(hasPasswordChangedNotice()).toBe(true);
});
