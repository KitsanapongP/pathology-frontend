import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/components/login-form";
import { ApiError } from "@/lib/api-client";
import { clearLoginNotice } from "@/lib/login-notice";

const mocks = vi.hoisted(() => ({ request: vi.fn(), login: vi.fn(), tenants: vi.fn(), accept: vi.fn(), replace: vi.fn(), generation: vi.fn(() => 0) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/portal-api", () => ({ portalApi: { request: mocks.request }, portalSession: { accept: mocks.accept, getGeneration: mocks.generation } }));
// auth/tenants ล้มเป็นค่าเริ่มต้น = ช่องพิมพ์รหัสโรงพยาบาลเอง (fallback) ส่วน test ของ dropdown ตั้ง mocks.tenants เอง
beforeEach(() => {
  mocks.login.mockReset(); mocks.tenants.mockReset().mockRejectedValue(new Error("synthetic offline"));
  mocks.request.mockReset().mockImplementation((path: string, init: unknown) => path === "auth/tenants" ? mocks.tenants(init) : mocks.login(path, init));
});
beforeEach(() => { localStorage.clear(); mocks.accept.mockReset(); mocks.replace.mockClear(); mocks.generation.mockReset().mockReturnValue(0); clearLoginNotice(); });

async function fill() {
  fireEvent.change(await screen.findByLabelText("รหัสโรงพยาบาล"), { target: { value: " synthetic-hospital " } });
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

it("validates required fields without submitting or allowing a demo role bypass", async () => {
  render(<LoginForm />); await screen.findByLabelText("รหัสโรงพยาบาล");
  fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  expect(screen.getByLabelText("รหัสโรงพยาบาล")).toHaveAccessibleDescription("กรุณาระบุรหัสโรงพยาบาล");
  expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("กรุณาระบุชื่อผู้ใช้");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("กรุณาระบุรหัสผ่าน");
  expect(mocks.login).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Admin|Student|SSO/ })).toBeNull();
});

it("uses auth.invalid_credentials regardless of the translated backend message", async () => {
  mocks.login.mockRejectedValue(new ApiError({ message: "Backend text can change", status: "error", status_code: 401, error_code: "auth.invalid_credentials", request_id: "synthetic" }, 401, "th"));
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("รหัสโรงพยาบาล ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
  expect(mocks.accept).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("blocks values over Swagger's limits without submitting or truncating the password", async () => {
  render(<LoginForm />); await screen.findByLabelText("รหัสโรงพยาบาล");
  const username = "u".repeat(101);
  const password = "p".repeat(257);
  fireEvent.change(screen.getByLabelText("รหัสโรงพยาบาล"), { target: { value: "h".repeat(101) } });
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByLabelText("รหัสโรงพยาบาล")).toHaveAccessibleDescription("รหัสโรงพยาบาลต้องไม่เกิน 100 ตัวอักษร");
  expect(screen.getByLabelText("ชื่อผู้ใช้")).toHaveAccessibleDescription("ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveAccessibleDescription("รหัสผ่านต้องไม่เกิน 256 ตัวอักษร");
  expect(screen.getByLabelText("รหัสผ่าน")).toHaveValue(password);
  expect(mocks.login).not.toHaveBeenCalled();
});

it.each(["x", "😀"])("allows exact Swagger character boundaries using %s", async character => {
  mocks.login.mockResolvedValue({ data: tokens });
  render(<LoginForm />); await screen.findByLabelText("รหัสโรงพยาบาล");
  const username = character.repeat(100);
  const password = character.repeat(256);
  const tenantCode = character.repeat(100);
  fireEvent.change(screen.getByLabelText("รหัสโรงพยาบาล"), { target: { value: tenantCode } });
  fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
  expect(mocks.request).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: { tenant_code: tenantCode, username, password } }));
});

it.each([false, true])("hands the token set to session and routes must_change_password=%s correctly", async forced => {
  const data = { ...tokens, must_change_password: forced };
  mocks.login.mockResolvedValue({ data });
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith(data, expect.any(Number)));
  expect(mocks.request).toHaveBeenCalledWith("auth/login", expect.objectContaining({ method: "POST", auth: false, body: { tenant_code: "synthetic-hospital", username: "synthetic-user", password: "synthetic-password" } }));
  expect(mocks.replace).toHaveBeenCalledWith(forced ? "/change-password" : "/portal");
  expect(localStorage.getItem("pathology:tenant-code:v1")).toBe("synthetic-hospital");
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

it("prefills the hospital code remembered from the last successful login", async () => {
  localStorage.setItem("pathology:tenant-code:v1", "remembered-hospital");
  render(<LoginForm />);
  await waitFor(() => expect(screen.getByLabelText("รหัสโรงพยาบาล")).toHaveValue("remembered-hospital"));
});

it("keeps backend tenant_code validation with the hospital code field", async () => {
  mocks.login.mockRejectedValue(new ApiError({ message: "Invalid values", status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic", errors: { tenant_code: ["Synthetic tenant validation"] } }, 422, "th"));
  render(<LoginForm />); await fill(); fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
  await waitFor(() => expect(screen.getByLabelText("รหัสโรงพยาบาล")).toHaveAccessibleDescription("Synthetic tenant validation"));
  expect(localStorage.getItem("pathology:tenant-code:v1")).toBeNull();
});

describe("hospital list from auth/tenants", () => {
  const hospitals = [{ code: "hospital-a", name: "Synthetic Hospital A" }, { code: "hospital-b", name: "Synthetic Hospital B" }];

  it("lets the user pick a hospital by name and sends its code", async () => {
    mocks.tenants.mockResolvedValue({ data: hospitals });
    mocks.login.mockResolvedValue({ data: tokens });
    render(<LoginForm />);
    const select = await screen.findByRole("combobox", { name: "โรงพยาบาล" });
    await waitFor(() => expect(select).toBeEnabled());
    expect(screen.getByRole("option", { name: "Synthetic Hospital B" })).toHaveValue("hospital-b");
    expect(mocks.tenants).toHaveBeenCalledWith(expect.objectContaining({ auth: false }));
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(select).toHaveAccessibleDescription("กรุณาเลือกโรงพยาบาล");
    fireEvent.change(select, { target: { value: "hospital-b" } });
    fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: "synthetic-user" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "synthetic-password" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
    expect(mocks.login).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: { tenant_code: "hospital-b", username: "synthetic-user", password: "synthetic-password" } }));
  });

  it("preselects the hospital remembered from the last login", async () => {
    localStorage.setItem("pathology:tenant-code:v1", "hospital-b");
    mocks.tenants.mockResolvedValue({ data: hospitals });
    render(<LoginForm />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "โรงพยาบาล" })).toHaveValue("hospital-b"));
  });

  it("hides the field and uses the only hospital", async () => {
    mocks.tenants.mockResolvedValue({ data: [hospitals[0]] });
    mocks.login.mockResolvedValue({ data: tokens });
    render(<LoginForm />);
    await waitFor(() => expect(screen.queryByLabelText("โรงพยาบาล")).toBeNull());
    fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: "synthetic-user" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "synthetic-password" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith("auth/login", expect.objectContaining({ body: { tenant_code: "hospital-a", username: "synthetic-user", password: "synthetic-password" } })));
  });

  it("falls back to typing the code when the list is empty", async () => {
    mocks.tenants.mockResolvedValue({ data: [] });
    render(<LoginForm />);
    expect(await screen.findByRole("textbox", { name: "รหัสโรงพยาบาล" })).toBeInTheDocument();
  });

  it("aborts the hospital list request on unmount", async () => {
    mocks.tenants.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(<LoginForm />);
    await waitFor(() => expect(mocks.tenants).toHaveBeenCalled());
    const signal = mocks.tenants.mock.calls[0][0].signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
