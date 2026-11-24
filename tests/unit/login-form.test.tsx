import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import LoginForm from "@/components/login-form";
import { ApiError } from "@/lib/api-client";
import { clearLoginNotice } from "@/lib/login-notice";

const mocks = vi.hoisted(() => ({ request: vi.fn(), login: vi.fn(), tenants: vi.fn(), accept: vi.fn(), replace: vi.fn(), generation: vi.fn(() => 0) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/portal-api", () => ({ portalApi: { request: mocks.request }, portalSession: { accept: mocks.accept, getGeneration: mocks.generation } }));
beforeEach(() => { mocks.login.mockReset(); mocks.tenants.mockReset().mockResolvedValue({ data: [{ code: "synthetic-hospital", name: "Synthetic Hospital" }] }); mocks.request.mockReset().mockImplementation((path: string, init: unknown) => path === "auth/tenants" ? mocks.tenants(init) : mocks.login(path, init)); mocks.accept.mockReset(); mocks.replace.mockClear(); mocks.generation.mockReset().mockReturnValue(0); clearLoginNotice(); });

async function fill() {
  await act(async () => {});
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
  expect(mocks.login).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Admin|Student|SSO/ })).toBeNull();
});

it("uses auth.invalid_credentials regardless of the translated backend message", async () => {
  mocks.login.mockRejectedValue(new ApiError({ message: "Backend text can change", status: "error", status_code: 401, error_code: "auth.invalid_credentials", request_id: "synthetic" }, 401, "th"));
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  expect(mocks.accept).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("blocks values over Swagger's limits without submitting or truncating the password", async () => {
  render(<LoginForm />); await act(async () => {});
  const username = "u".repeat(101);
  const password = "p".repeat(257);
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("รหัสผ่านต้องไม่เกิน 256 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveValue(password);
  expect(mocks.login).not.toHaveBeenCalled();
});

it.each(["x", "😀"])("allows exact Swagger character boundaries using %s", async character => {
  mocks.login.mockResolvedValue({ data: tokens });
  render(<LoginForm />); await act(async () => {});
  const username = character.repeat(100);
  const password = character.repeat(256);
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
  expect(mocks.login).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: { tenant_code: "synthetic-hospital", username, password } }));
});

it.each([false, true])("hands the token set to session and routes must_change_password=%s correctly", async forced => {
  const data = { ...tokens, must_change_password: forced };
  mocks.login.mockResolvedValue({ data });
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith(data, expect.any(Number)));
  expect(mocks.login).toHaveBeenCalledWith("auth/login", expect.objectContaining({ method: "POST", auth: false, body: { tenant_code: "synthetic-hospital", username: "synthetic-user", password: "synthetic-password" } }));
  expect(mocks.replace).toHaveBeenCalledWith(forced ? "/change-password" : "/portal");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveValue("");
});

it("keeps field validation messages with the corresponding field", async () => {
  mocks.login.mockRejectedValue(new ApiError({ message: "Invalid values", status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic", errors: { username: ["Synthetic username validation"], password: ["Synthetic password validation"] } }, 422, "th"));
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("Synthetic username validation"));
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("Synthetic password validation");
});

it("prevents duplicate login and does not establish a session after unmount", async () => {
  let resolve!: (value: unknown) => void;
  mocks.login.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { unmount } = render(<LoginForm />); await fill();
  fireEvent.submit(screen.getByRole("form")); fireEvent.submit(screen.getByRole("form"));
  expect(mocks.login).toHaveBeenCalledTimes(1);
  const signal = mocks.login.mock.calls[0][1].signal;
  unmount(); expect(signal.aborted).toBe(true);
  resolve({ data: tokens });
  await Promise.resolve();
  expect(mocks.accept).not.toHaveBeenCalled();
});


it("keeps hospital controls absent while discovery is pending or fails", async () => {
  mocks.tenants.mockRejectedValue(new Error("synthetic offline"));
  render(<LoginForm />); await fill();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByLabelText("รหัสโรงพยาบาล")).toBeNull();
  fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByRole("alert")).toHaveTextContent("ยังไม่สามารถระบุโรงพยาบาลสำหรับเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ");
  expect(mocks.login).not.toHaveBeenCalled();
});

it("resolves a remembered hospital without choosing the first of multiple hospitals", async () => {
  localStorage.setItem("pathology:tenant-code:v1", "hospital-b");
  mocks.tenants.mockResolvedValue({ data: [{ code: "hospital-a", name: "A" }, { code: "hospital-b", name: "B" }] });
  mocks.login.mockResolvedValue({ data: tokens });
  render(<LoginForm />); await fill(); fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
  expect(mocks.login).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: expect.objectContaining({ tenant_code: "hospital-b" }) }));
});

it("does not select an arbitrary hospital when discovery is ambiguous", async () => {
  mocks.tenants.mockResolvedValue({ data: [{ code: "hospital-a", name: "A" }, { code: "hospital-b", name: "B" }] });
  render(<LoginForm />); await fill(); fireEvent.submit(screen.getByRole("form"));
  expect(mocks.login).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeVisible();
});

it("shows backend tenant errors as form feedback while the hospital control is hidden", async () => {
  mocks.login.mockRejectedValue(new ApiError({ message: "Invalid values", status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic", errors: { tenant_code: ["Synthetic tenant validation"] } }, 422, "th"));
  render(<LoginForm />); await fill(); fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Synthetic tenant validation");
});
