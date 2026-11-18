import type { FieldErrors } from "./api-client";

export type UserProfile = {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  status: string;
  tenant_id: string;
  must_change_password: boolean;
  created_at: number;
};
export type ProfileValues = Pick<UserProfile, "first_name" | "last_name" | "email"> & { phone_number: string };

export function profileValues(profile: UserProfile): ProfileValues {
  return { first_name: profile.first_name, last_name: profile.last_name, email: profile.email, phone_number: profile.phone_number ?? "" };
}

/** Return UI message keys; backend errors must stay in their original language. */
export function validateProfile(values: ProfileValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.first_name.trim()) errors.first_name = ["กรุณาระบุชื่อ"];
  else if (Array.from(values.first_name).length > 255) errors.first_name = ["ชื่อต้องไม่เกิน 255 ตัวอักษร"];
  if (!values.last_name.trim()) errors.last_name = ["กรุณาระบุนามสกุล"];
  else if (Array.from(values.last_name).length > 255) errors.last_name = ["นามสกุลต้องไม่เกิน 255 ตัวอักษร"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = ["กรุณาระบุอีเมลให้ถูกต้อง"];
  if (values.phone_number && !/^\d{1,20}$/.test(values.phone_number)) errors.phone_number = ["เบอร์โทรศัพท์ต้องเป็นตัวเลขไม่เกิน 20 หลัก"];
  return errors;
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return ["user_id", "username", "first_name", "last_name", "email", "status", "tenant_id"].every(key => typeof data[key] === "string")
    && (data.phone_number == null || typeof data.phone_number === "string")
    && typeof data.must_change_password === "boolean" && typeof data.created_at === "number" && Number.isFinite(data.created_at);
}
