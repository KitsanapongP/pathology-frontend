"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type FieldErrors } from "@/lib/api-client";
import { adminUserError, adminUserPayload, adminUserValues, emptyAdminUser, validateAdminUser, type AdminUserValues } from "@/lib/admin-user";
import { portalApi, portalSession } from "@/lib/portal-api";
import { canPortal } from "@/lib/portal-permissions";
import { isUserProfile } from "@/lib/portal-user";
import { ApiErrorNotice, ApiFieldErrors } from "./api-feedback";
import PortalForbidden from "./portal-forbidden";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";

const fields = [
  { name: "username", label: "ชื่อผู้ใช้", type: "text" },
  { name: "email", label: "อีเมล", type: "email" },
  { name: "first_name", label: "ชื่อ", type: "text" },
  { name: "last_name", label: "นามสกุล", type: "text" },
  { name: "phone_number", label: "เบอร์โทรศัพท์", type: "tel" },
] as const;

export default function AdminUserDialog({ userId, preview, onClose, onSaved }: { userId?: string; preview: boolean; onClose: () => void; onSaved: (creating: boolean) => void }) {
  const { t } = usePortalLanguage();
  const creating = !userId;
  const dialog = useRef<HTMLDialogElement>(null);
  const write = useRef<AbortController | null>(null);
  const [values, setValues] = useState<AdminUserValues>({ ...emptyAdminUser });
  const [baseline, setBaseline] = useState<AdminUserValues | null>(null);
  const [loading, setLoading] = useState(!creating && !preview);
  const [loaded, setLoaded] = useState(creating);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [failure, setFailure] = useState("");
  const title = creating ? "สร้างผู้ใช้" : "แก้ไขผู้ใช้";
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
    if (creating || preview) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setApiError(null); setFailure(""); setLoaded(false);
      try {
        const response = await portalApi.request<unknown>(`users/${encodeURIComponent(userId!)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (controller.signal.aborted) return;
        if (!isUserProfile(response.data) || response.data.user_id !== userId) throw new Error("Invalid GET /v1/users/{user_id} response. Verify the selected user contract.");
        const initial = adminUserValues(response.data);
        setValues(initial); setBaseline(initial); setLoaded(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError) setApiError(error);
        else setFailure("โหลดข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [creating, preview, userId, attempt]);
  function close() { if (write.current) return; dialog.current?.close(); onClose(); }
  function update(name: keyof AdminUserValues, value: string) { setValues(current => ({ ...current, [name]: value })); }
  const dirty = creating || !!baseline && Object.keys(baseline).some(key => baseline[key as keyof AdminUserValues] !== values[key as keyof AdminUserValues]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || !loaded || write.current || !dirty || !canPortal(portalSession.getSnapshot(), creating ? "users.create" : "users.update")) return;
    const validation = validateAdminUser(values, creating);
    setErrors(validation); setApiError(null); setFailure("");
    const form = event.currentTarget;
    function focusError(fieldErrors: FieldErrors) {
      const first = [...fields.map(field => field.name), "status", "password", "password_confirmation"].find(name => fieldErrors[name]?.length);
      const control = first && form.elements.namedItem(first);
      if (control instanceof HTMLElement && control.isConnected) control.focus();
    }
    if (Object.keys(validation).length) { focusError(validation); return; }
    const controller = new AbortController(); write.current = controller; setSaving(true);
    try {
      await portalApi.request(creating ? "users" : `users/${encodeURIComponent(userId!)}`, {
        method: creating ? "POST" : "PUT", body: adminUserPayload(values, creating), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
      });
      if (controller.signal.aborted) return;
      // Do not retain either password in React state after a successful write.
      setValues({ ...emptyAdminUser });
      dialog.current?.close(); onSaved(creating);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        const feedback = adminUserError(error);
        setApiError(feedback); focusError(feedback.fieldErrors);
        if (error.errorCode === "client.network_error") setFailure("ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจสอบรายการผู้ใช้ก่อนลองอีกครั้ง");
        if (error.errorCode === "users.not_found" || error.httpStatus === 404) setLoaded(false);
      }
      else setFailure("ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจสอบรายการผู้ใช้ก่อนลองอีกครั้ง");
    } finally {
      if (write.current === controller) write.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  const forbidden = apiError?.httpStatus === 403;
  const notFound = apiError?.errorCode === "users.not_found" || apiError?.httpStatus === 404;
  const fieldError = (name: string) => !!(errors[name]?.length || apiError?.fieldErrors[name]?.length);
  function feedback(name: string) {
    return errors[name]?.length ? <div id={`admin-user-${name}-errors`} role="alert" className="profile-field-error">{errors[name].map(message => <p key={message}>{t(message)}</p>)}</div>
      : <ApiFieldErrors id={`admin-user-${name}-errors`} field={name} error={apiError} />;
  }
  return <dialog ref={dialog} className="admin-user-dialog" aria-labelledby="admin-user-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="admin-user-dialog-heading"><h2 id="admin-user-title"><PortalText>{title}</PortalText></h2><button type="button" disabled={saving} onClick={close} className="portal-icon-button" aria-label={t("ปิดหน้าต่าง")}><PortalIcon name="close" /></button></div>
    {forbidden ? <PortalForbidden error={apiError!} /> : <div className="admin-user-dialog-body">
      {preview && <p role="note"><PortalText>การจัดการผู้ใช้ใช้ได้เมื่อเข้าสู่ระบบด้วยบัญชีจริง โหมดตัวอย่างไม่บันทึกข้อมูล</PortalText></p>}
      {loading ? <p role="status"><PortalText>กำลังโหลดข้อมูลผู้ใช้</PortalText></p> : !loaded ? <div className="users-feedback">
        <ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}
        {!notFound && <button className="intake-button" onClick={() => setAttempt(value => value + 1)}><PortalText>โหลดข้อมูลผู้ใช้อีกครั้ง</PortalText></button>}
        <button className="intake-button" onClick={close}><PortalText>กลับไปรายการผู้ใช้</PortalText></button>
      </div> : <form noValidate autoComplete="off" aria-label={t(title)} aria-busy={saving} onSubmit={save}>
        {creating && <p id="admin-user-initial-password-note" className="admin-user-password-note"><PortalText>ผู้ใช้ใหม่ต้องเปลี่ยนรหัสผ่านเริ่มต้นเมื่อเข้าสู่ระบบครั้งแรก</PortalText></p>}
        <fieldset disabled={saving || preview} className="profile-fields">
          {fields.map(field => <div className="profile-field" key={field.name}>
            <label htmlFor={`admin-user-${field.name}`}>{t(field.label)}</label>
            <input id={`admin-user-${field.name}`} name={field.name} type={field.type} value={values[field.name]} required={field.name !== "phone_number"} inputMode={field.name === "phone_number" ? "numeric" : undefined} aria-invalid={fieldError(field.name)} aria-describedby={fieldError(field.name) ? `admin-user-${field.name}-errors` : undefined} onChange={event => update(field.name, event.target.value)} />
            {feedback(field.name)}
          </div>)}
          <div className="profile-field"><label htmlFor="admin-user-status"><PortalText>สถานะบัญชี</PortalText></label><select id="admin-user-status" name="status" value={values.status} aria-invalid={fieldError("status")} aria-describedby={fieldError("status") ? "admin-user-status-errors" : undefined} onChange={event => update("status", event.target.value)}><option value="active">{t("ใช้งานอยู่")}</option><option value="inactive">{t("ปิดใช้งาน")}</option></select>{feedback("status")}</div>
          {creating && ([{ name: "password", label: "รหัสผ่านเริ่มต้น" }, { name: "password_confirmation", label: "ยืนยันรหัสผ่านเริ่มต้น" }] as const).map(field => <div className="profile-field" key={field.name}>
            <label htmlFor={`admin-user-${field.name}`}>{t(field.label)}</label><input id={`admin-user-${field.name}`} name={field.name} type="password" autoComplete="new-password" required value={values[field.name]} aria-invalid={fieldError(field.name)} aria-describedby={`admin-user-initial-password-note${fieldError(field.name) ? ` admin-user-${field.name}-errors` : ""}`} onChange={event => update(field.name, event.target.value)} />{feedback(field.name)}
          </div>)}
          <div className="profile-wide profile-feedback"><ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}</div>
        </fieldset>
        <div className="profile-actions"><button type="submit" className="profile-save" disabled={preview || saving || !dirty}><PortalText>{saving ? "กำลังบันทึก" : creating ? "สร้างผู้ใช้" : "บันทึกผู้ใช้"}</PortalText></button><button type="button" className="profile-discard" disabled={saving} onClick={close}><PortalText>ยกเลิก</PortalText></button></div>
      </form>}
    </div>}
  </dialog>;
}
