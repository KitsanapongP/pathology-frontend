"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type FieldErrors } from "@/lib/api-client";
import { portalApi, portalSession } from "@/lib/portal-api";
import { canPortal } from "@/lib/portal-permissions";
import { isUserProfile, type UserProfile } from "@/lib/portal-user";
import { ApiErrorNotice, ApiFieldErrors } from "./api-feedback";
import PortalForbidden from "./portal-forbidden";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";

export type AdminUserAction = "reset" | "delete";

export default function AdminUserActionDialog({ action, userId, onClose, onCompleted }: { action: AdminUserAction; userId: string; onClose: () => void; onCompleted: (action: AdminUserAction) => void }) {
  const { t } = usePortalLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const write = useRef<AbortController | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [typedUsername, setTypedUsername] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [failure, setFailure] = useState("");
  const resetting = action === "reset";
  const title = resetting ? "รีเซ็ตรหัสผ่านผู้ใช้" : "ลบผู้ใช้";
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      write.current?.abort(); element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setApiError(null); setFailure(""); setUser(null); setTypedUsername("");
      try {
        const response = await portalApi.request<unknown>(`users/${encodeURIComponent(userId)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (controller.signal.aborted) return;
        if (!isUserProfile(response.data) || response.data.user_id !== userId || !response.data.username.trim()) throw new Error("Invalid selected-user response. Verify GET /v1/users/{user_id} before user actions.");
        setUser(response.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError) setApiError(error);
        else setFailure("โหลดข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [userId, attempt]);
  function close() { if (write.current) return; dialog.current?.close(); onClose(); }
  const notFound = apiError?.errorCode === "users.not_found" || apiError?.httpStatus === 404;
  const forbidden = apiError?.httpStatus === 403;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || write.current || !canPortal(portalSession.getSnapshot(), resetting ? "users.reset-password" : "users.delete")) return;
    const validation: FieldErrors = {};
    if (resetting) {
      if (Array.from(password).length < 8) validation.new_password = ["รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"];
      if (password !== confirmation) validation.password_confirmation = ["รหัสผ่านยืนยันไม่ตรงกัน"];
    } else if (typedUsername !== user.username) validation.username_confirmation = ["กรุณาพิมพ์ชื่อผู้ใช้ให้ตรงกับบัญชีที่ต้องการลบ"];
    setErrors(validation); setApiError(null); setFailure("");
    if (Object.keys(validation).length) {
      const control = event.currentTarget.elements.namedItem(Object.keys(validation)[0]);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    const controller = new AbortController(); write.current = controller; setSaving(true);
    try {
      await portalApi.request(`users/${encodeURIComponent(userId)}${resetting ? "/password" : ""}`, {
        method: resetting ? "PUT" : "DELETE", ...(resetting ? { body: { new_password: password } } : {}),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
      });
      if (controller.signal.aborted) return;
      setPassword(""); setConfirmation(""); setTypedUsername("");
      dialog.current?.close(); onCompleted(action);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        setApiError(error);
        if (error.errorCode === "client.network_error") setFailure("ยังยืนยันการดำเนินการไม่ได้ กรุณาตรวจสอบบัญชีผู้ใช้ก่อนลองอีกครั้ง");
      } else setFailure("ยังยืนยันการดำเนินการไม่ได้ กรุณาตรวจสอบบัญชีผู้ใช้ก่อนลองอีกครั้ง");
    } finally {
      if (write.current === controller) write.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  function fieldFeedback(name: string) {
    return errors[name]?.length ? <div id={`user-action-${name}-errors`} role="alert" className="profile-field-error">{errors[name].map(message => <p key={message}>{t(message)}</p>)}</div>
      : <ApiFieldErrors id={`user-action-${name}-errors`} field={name} error={apiError} />;
  }
  const invalid = (name: string) => !!(errors[name]?.length || apiError?.fieldErrors[name]?.length);
  return <dialog ref={dialog} className="admin-user-dialog admin-user-action-dialog" aria-labelledby="user-action-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="admin-user-dialog-heading"><h2 id="user-action-title"><PortalText>{title}</PortalText></h2><button type="button" className="portal-icon-button" disabled={saving} onClick={close} aria-label={t("ปิดหน้าต่าง")}><PortalIcon name="close" /></button></div>
    {forbidden ? <PortalForbidden error={apiError!} /> : <div className="admin-user-dialog-body">
      {loading ? <p role="status"><PortalText>กำลังโหลดข้อมูลผู้ใช้</PortalText></p> : !user || notFound ? <div className="users-feedback">
        <ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}
        {!notFound && <button className="intake-button" onClick={() => setAttempt(value => value + 1)}><PortalText>โหลดข้อมูลผู้ใช้อีกครั้ง</PortalText></button>}
        <button className="intake-button" onClick={close}><PortalText>กลับไปรายการผู้ใช้</PortalText></button>
      </div> : <form noValidate autoComplete="off" aria-label={t(title)} aria-busy={saving} onSubmit={submit}>
        <dl className="user-action-identity"><div><dt><PortalText>ชื่อผู้ใช้</PortalText></dt><dd>{user.username}</dd></div><div><dt><PortalText>ชื่อ–นามสกุล</PortalText></dt><dd>{user.first_name} {user.last_name}</dd></div><div><dt><PortalText>อีเมล</PortalText></dt><dd>{user.email}</dd></div></dl>
        <p id="user-action-consequence" className="user-action-consequence"><PortalText>{resetting ? "ผู้ใช้จะออกจากระบบทุกอุปกรณ์ และต้องเปลี่ยนรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งถัดไป" : "บัญชีนี้จะถูกลบออกจากรายการและไม่สามารถเข้าสู่ระบบได้"}</PortalText></p>
        <fieldset disabled={saving} className="profile-fields">
          {resetting ? ([{ name: "new_password", label: "รหัสผ่านใหม่", value: password, change: setPassword }, { name: "password_confirmation", label: "ยืนยันรหัสผ่านใหม่", value: confirmation, change: setConfirmation }] as const).map(field => <div className="profile-field" key={field.name}>
            <label htmlFor={`user-action-${field.name}`}>{t(field.label)}</label><input id={`user-action-${field.name}`} name={field.name} type="password" autoComplete="new-password" required value={field.value} aria-invalid={invalid(field.name)} aria-describedby={`user-action-consequence${invalid(field.name) ? ` user-action-${field.name}-errors` : ""}`} onChange={event => field.change(event.target.value)} />{fieldFeedback(field.name)}
          </div>) : <div className="profile-field profile-wide"><label htmlFor="user-action-username-confirmation"><PortalText>พิมพ์ชื่อผู้ใช้เพื่อยืนยัน</PortalText></label><input id="user-action-username-confirmation" name="username_confirmation" required autoCapitalize="none" spellCheck={false} value={typedUsername} aria-invalid={invalid("username_confirmation")} aria-describedby={`user-action-consequence${invalid("username_confirmation") ? " user-action-username_confirmation-errors" : ""}`} onChange={event => setTypedUsername(event.target.value)} />{fieldFeedback("username_confirmation")}</div>}
        </fieldset>
        <div className="profile-feedback user-action-feedback"><ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}</div>
        <div className="profile-actions"><button type="submit" className={resetting ? "profile-save" : "user-action-delete"} disabled={saving || (!resetting && typedUsername !== user.username)}><PortalText>{saving ? "กำลังดำเนินการ" : resetting ? "ยืนยันรีเซ็ตรหัสผ่าน" : "ยืนยันลบผู้ใช้"}</PortalText></button><button type="button" className="profile-discard" disabled={saving} onClick={close}><PortalText>ยกเลิก</PortalText></button></div>
      </form>}
    </div>}
  </dialog>;
}
