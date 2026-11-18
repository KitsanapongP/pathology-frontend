import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ProfilePage from "@/components/profile-page";
import { ApiError } from "@/lib/api-client";
import { validateProfile } from "@/lib/portal-user";

const mocks = vi.hoisted(() => ({ request: vi.fn(), replace: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/portal-api", () => ({ portalApi: { request: mocks.request }, portalSession: { subscribe: () => () => {}, getSnapshot: () => "authenticated", clear: mocks.clear } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
const profile = { user_id: "synthetic-user-id", username: "synthetic-user", first_name: "Synthetic", last_name: "User", email: "synthetic@example.invalid", phone_number: null, status: "active", tenant_id: "synthetic-tenant", must_change_password: false, created_at: 1_700_000_000 };
beforeEach(() => { mocks.request.mockReset().mockResolvedValue({ data: profile }); mocks.replace.mockClear(); mocks.clear.mockClear(); });

it("validates Unicode limits, email, optional phone and leading zeroes", () => {
  const valid = { first_name: "😀".repeat(255), last_name: "x".repeat(255), email: "synthetic@example.invalid", phone_number: "0".repeat(20) };
  expect(validateProfile(valid)).toEqual({});
  expect(validateProfile({ ...valid, phone_number: "" })).toEqual({});
  expect(Object.keys(validateProfile({ first_name: "😀".repeat(256), last_name: " ", email: "invalid", phone_number: "+123" }))).toEqual(["first_name", "last_name", "email", "phone_number"]);
  expect(validateProfile({ ...valid, phone_number: "0".repeat(21) })).toHaveProperty("phone_number");
});

it("loads the account, discards buffered edits, and saves only editable contract fields", async () => {
  render(<ProfilePage />);
  const firstName = await screen.findByLabelText("ชื่อ", { exact: true });
  expect(firstName).toHaveValue("Synthetic");
  expect(screen.getByLabelText("เบอร์โทรศัพท์")).toHaveValue("");
  expect(screen.queryByRole("textbox", { name: "ชื่อผู้ใช้" })).toBeNull();
  fireEvent.change(firstName, { target: { value: "Discard me" } });
  fireEvent.click(screen.getByRole("button", { name: "ยกเลิกการแก้ไข" }));
  expect(firstName).toHaveValue("Synthetic");
  expect(mocks.request).toHaveBeenCalledTimes(1);
  fireEvent.change(firstName, { target: { value: " Updated " } });
  fireEvent.change(screen.getByLabelText("เบอร์โทรศัพท์"), { target: { value: "000123" } });
  fireEvent.submit(screen.getByRole("form", { name: "แก้ไขโปรไฟล์" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("บันทึกโปรไฟล์แล้ว"));
  expect(mocks.request).toHaveBeenLastCalledWith("users/me", expect.objectContaining({ method: "PUT", body: { first_name: "Updated", last_name: "User", email: "synthetic@example.invalid", phone_number: "000123" } }));
  expect(screen.getByRole("button", { name: "บันทึกโปรไฟล์" })).toBeDisabled();
  expect(mocks.clear).not.toHaveBeenCalled();
});

it("preserves backend field messages as text and keeps edits on failure", async () => {
  mocks.request.mockResolvedValueOnce({ data: profile }).mockRejectedValueOnce(new ApiError({ message: "Backend message", status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic", errors: { email: ["<b>Backend email error</b>"] } }, 422, "en"));
  const { container } = render(<ProfilePage />);
  const email = await screen.findByLabelText("อีเมล");
  fireEvent.change(email, { target: { value: "changed@example.invalid" } });
  fireEvent.submit(screen.getByRole("form", { name: "แก้ไขโปรไฟล์" }));
  await waitFor(() => expect(email).toHaveAccessibleDescription("<b>Backend email error</b>"));
  expect(email).toHaveValue("changed@example.invalid");
  expect(container.querySelector("b")).toBeNull();
  expect(mocks.clear).not.toHaveBeenCalled();
});

it("offers retry after a failed profile read instead of enabling a blank form", async () => {
  mocks.request.mockRejectedValueOnce(new ApiError({ message: "Synthetic unavailable", status: "error", status_code: 503, error_code: "internal.error", request_id: "synthetic-profile-503" }, 503, "th")).mockResolvedValue({ data: profile });
  render(<ProfilePage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("synthetic-profile-503");
  expect(screen.queryByRole("form")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "โหลดโปรไฟล์อีกครั้ง" }));
  expect(await screen.findByLabelText("ชื่อ", { exact: true })).toHaveValue("Synthetic");
});

it("prevents duplicate profile writes and password changes during a pending save", async () => {
  let resolve!: (value: unknown) => void;
  mocks.request.mockResolvedValueOnce({ data: profile }).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { unmount } = render(<ProfilePage />);
  fireEvent.change(await screen.findByLabelText("ชื่อ", { exact: true }), { target: { value: "Updated" } });
  const form = screen.getByRole("form", { name: "แก้ไขโปรไฟล์" });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(within(screen.getByRole("form", { name: "เปลี่ยนรหัสผ่านของฉัน" })).getByRole("button", { name: "เปลี่ยนรหัสผ่าน" })).toBeDisabled();
  const signal = mocks.request.mock.calls[1][1].signal;
  unmount(); expect(signal.aborted).toBe(true);
  resolve({ data: null });
  await Promise.resolve();
  expect(mocks.clear).not.toHaveBeenCalled();
});
