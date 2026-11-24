import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { adminUserError, adminUserPayload, emptyAdminUser, validateAdminUser } from "@/lib/admin-user";

const valid = { ...emptyAdminUser, username: " synthetic-user ", first_name: " Synthetic ", last_name: " User ", email: " synthetic@example.invalid ", phone_number: " 00123 ", password: "  secret password  ", password_confirmation: "  secret password  " };

describe("hospital user writes", () => {
  it("uses Unicode character limits and distinguishes create passwords from edits", () => {
    expect(validateAdminUser(valid, true)).toEqual({});
    expect(validateAdminUser({ ...valid, username: "😀".repeat(100), first_name: "😀".repeat(255), password: "😀".repeat(8), password_confirmation: "😀".repeat(8) }, true)).toEqual({});
    expect(validateAdminUser({ ...valid, username: "xy", first_name: "😀".repeat(256), phone_number: "+123", password: "short", password_confirmation: "different" }, true)).toMatchObject({ username: expect.any(Array), first_name: expect.any(Array), phone_number: expect.any(Array), password: expect.any(Array), password_confirmation: expect.any(Array) });
    expect(validateAdminUser({ ...valid, password: "", password_confirmation: "ignored" }, false)).toEqual({});
  });
  it("sends only contract fields, preserves leading zeroes and never trims passwords", () => {
    expect(adminUserPayload(valid, true)).toEqual({ username: "synthetic-user", first_name: "Synthetic", last_name: "User", email: "synthetic@example.invalid", phone_number: "00123", status: "active", password: "  secret password  " });
    expect(adminUserPayload(valid, false)).not.toHaveProperty("password");
    expect(adminUserPayload(valid, true)).not.toHaveProperty("password_confirmation");
    expect(adminUserPayload(valid, true)).not.toHaveProperty("tenant_id");
  });
  it("maps duplicate codes without translating backend messages or losing combined field errors", () => {
    const error = new ApiError({ message: "Synthetic original message", status: "error", status_code: 400, error_code: "users.username_already_exists", request_id: "synthetic", errors: { email: ["Synthetic duplicate email"] } }, 400, "en");
    expect(adminUserError(error).fieldErrors).toEqual({ username: ["Synthetic original message"], email: ["Synthetic duplicate email"] });
    const combined = new ApiError({ ...error.response, error_code: "synthetic.combined_conflict", errors: { username: ["Username conflict"], email: ["Email conflict"] } }, 400, "en");
    expect(adminUserError(combined)).toBe(combined);
  });
});
