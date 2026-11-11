"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type FieldErrors } from "@/lib/api-client";
import { portalApi, portalSession } from "@/lib/portal-api";
import { markPasswordChanged } from "@/lib/login-notice";
import { ApiErrorNotice } from "./api-feedback";
import PasswordField from "./password-field";
import LogoutButton from "./logout-button";
import { usePortalLanguage } from "./portal-preferences";

export default function ChangePasswordForm() {
  const { t } = usePortalLanguage();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const next: FieldErrors = {};
    if (!oldPassword) next.old_password = [t("กรุณาระบุรหัสผ่านเดิม")];
    if (Array.from(newPassword).length < 8) next.new_password = [t("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")];
    if (!confirmation || confirmation !== newPassword) next.confirm_password = [t("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน")];
    setErrors(next); setApiError(null); setFailure("");
    if (Object.keys(next).length) return;
    const controller = new AbortController(); request.current = controller; setPending(true);
    try {
      await portalApi.request("users/me/password", { method: "PUT", body: { old_password: oldPassword, new_password: newPassword }, signal: controller.signal });
      markPasswordChanged();
      setOldPassword(""); setNewPassword(""); setConfirmation("");
      // Backend closes all sessions after this action; do not refresh or reuse this token.
      portalSession.clear();
      router.replace("/");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        setApiError(error);
        setErrors({ ...error.fieldErrors, ...(error.errorCode === "users.wrong_password" ? { old_password: [t("รหัสผ่านเดิมไม่ถูกต้อง")] } : {}) });
      } else setFailure(t("ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง"));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return <form noValidate onSubmit={submit} className="mt-7" aria-label={t("เปลี่ยนรหัสผ่านครั้งแรก")}>
    <fieldset disabled={pending} className="space-y-5">
      <PasswordField id="old_password" label="รหัสผ่านเดิม" value={oldPassword} onChange={setOldPassword} errors={errors.old_password} autoComplete="current-password" />
      <PasswordField id="new_password" label="รหัสผ่านใหม่" value={newPassword} onChange={setNewPassword} errors={errors.new_password} autoComplete="new-password" minLength={8} />
      <PasswordField id="confirm_password" label="ยืนยันรหัสผ่านใหม่" value={confirmation} onChange={setConfirmation} errors={errors.confirm_password} autoComplete="new-password" minLength={8} />
      <div className="text-sm text-red-700"><ApiErrorNotice error={apiError} />{failure && <p role="alert">{failure}</p>}</div>
      <button type="submit" className="min-h-12 w-full rounded-lg bg-[#10396f] px-4 py-3 text-base font-semibold text-white disabled:opacity-60">{t(pending ? "กำลังเปลี่ยนรหัสผ่าน" : "เปลี่ยนรหัสผ่าน")}</button>
    </fieldset>
    <div className="mt-5 flex justify-center"><LogoutButton className="flex items-center gap-2 text-sm text-[#1556b8]" /></div>
  </form>;
}
