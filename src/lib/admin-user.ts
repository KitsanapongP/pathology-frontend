import { ApiError, type FieldErrors } from "./api-client";
import { profileValues, validateProfile, type ProfileValues, type UserProfile } from "./portal-user";

export type AdminUserValues = ProfileValues & { username: string; status: "active" | "inactive"; password: string; password_confirmation: string };
export const emptyAdminUser: AdminUserValues = { username: "", first_name: "", last_name: "", email: "", phone_number: "", status: "active", password: "", password_confirmation: "" };

export function adminUserValues(user: UserProfile): AdminUserValues {
  if (user.status !== "active" && user.status !== "inactive") throw new Error("Unsupported user status. Verify the portal UserResponse contract.");
  return { ...emptyAdminUser, ...profileValues(user), username: user.username, status: user.status };
}

export function adminUserPayload(values: AdminUserValues, creating: boolean) {
  return {
    username: values.username.trim(), first_name: values.first_name.trim(), last_name: values.last_name.trim(),
    email: values.email.trim(), phone_number: values.phone_number.trim(), status: values.status,
    ...(creating ? { password: values.password } : {}),
  };
}

export function validateAdminUser(values: AdminUserValues, creating: boolean): FieldErrors {
  const next = adminUserPayload(values, creating);
  const errors = validateProfile(next);
  const usernameLength = Array.from(next.username).length;
  if (usernameLength < 3 || usernameLength > 100) errors.username = ["ชื่อผู้ใช้ต้องมี 3–100 ตัวอักษร"];
  if (next.status !== "active" && next.status !== "inactive") errors.status = ["กรุณาเลือกสถานะบัญชี"];
  if (creating) {
    if (Array.from(values.password).length < 8) errors.password = ["รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 8 ตัวอักษร"];
    if (values.password !== values.password_confirmation) errors.password_confirmation = ["รหัสผ่านยืนยันไม่ตรงกัน"];
  }
  return errors;
}

/** Preserve backend strings, including duplicate errors that omit per-field feedback. */
export function adminUserError(error: ApiError): ApiError {
  const field = error.errorCode === "users.username_already_exists" ? "username" : error.errorCode === "users.email_already_exists" ? "email" : null;
  if (!field || error.fieldErrors[field]?.length) return error;
  return new ApiError({ ...error.response, errors: { ...error.fieldErrors, [field]: [error.message] } }, error.httpStatus, error.language, error.retryAfterSeconds);
}
