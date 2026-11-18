"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ApiError, type FieldErrors } from "@/lib/api-client";
import { isDemoAuth } from "@/lib/demo-session";
import { portalApi, portalSession } from "@/lib/portal-api";
import { isUserProfile, profileValues, validateProfile, type ProfileValues, type UserProfile } from "@/lib/portal-user";
import { ApiErrorNotice, ApiFieldErrors } from "./api-feedback";
import ChangePasswordForm from "./change-password-form";
import PortalDate from "./portal-date";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";

const emptyValues: ProfileValues = { first_name: "", last_name: "", email: "", phone_number: "" };
const fields = [
  { name: "first_name", label: "ชื่อ", type: "text", autoComplete: "given-name" },
  { name: "last_name", label: "นามสกุล", type: "text", autoComplete: "family-name" },
  { name: "email", label: "อีเมล", type: "email", autoComplete: "email" },
  { name: "phone_number", label: "เบอร์โทรศัพท์", type: "tel", autoComplete: "tel-national" },
] as const;

export default function ProfilePage() {
  const { t } = usePortalLanguage();
  const session = useSyncExternalStore(portalSession.subscribe, portalSession.getSnapshot, () => "checking");
  const preview = isDemoAuth() && session !== "authenticated" && session !== "password-required";
  return <main className="profile-main">
    <div className="profile-content">
      <nav aria-label={t("เส้นทางหน้า")} className="intake-breadcrumb flex items-center gap-3"><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home" /><PortalText>หน้าแรก</PortalText></Link><PortalIcon name="chevron" /><span aria-current="page"><PortalText>โปรไฟล์ของฉัน</PortalText></span></nav>
      <h1 className="profile-heading"><PortalText>โปรไฟล์ของฉัน</PortalText></h1>
      <ProfileEditor key={preview ? "preview" : "account"} preview={preview} />
    </div>
  </main>;
}

function ProfileEditor({ preview }: { preview: boolean }) {
  const { t } = usePortalLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [values, setValues] = useState<ProfileValues>(emptyValues);
  const [loading, setLoading] = useState(!preview);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setApiError(null); setFailure("");
      try {
        const response = await portalApi.request<unknown>("users/me", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!isUserProfile(response.data)) throw new Error("Invalid GET /v1/users/me data. Verify the backend profile contract.");
        setProfile(response.data); setValues(profileValues(response.data));
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError) setApiError(error);
        else setFailure("โหลดโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [attempt, preview]);

  const dirty = !!profile && fields.some(field => values[field.name] !== profileValues(profile)[field.name]);
  function discard() {
    if (profile) setValues(profileValues(profile));
    setErrors({}); setApiError(null); setFailure(""); setSaved(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || !profile || request.current || passwordPending || !dirty) return;
    const next: ProfileValues = { first_name: values.first_name.trim(), last_name: values.last_name.trim(), email: values.email.trim(), phone_number: values.phone_number.trim() };
    const validation = validateProfile(next);
    setErrors(validation); setApiError(null); setFailure(""); setSaved(false);
    if (Object.keys(validation).length) return;
    const controller = new AbortController(); request.current = controller; setSaving(true);
    try {
      await portalApi.request("users/me", { method: "PUT", body: next, signal: controller.signal });
      if (controller.signal.aborted) return;
      setProfile({ ...profile, ...next }); setValues(next); setSaved(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        setApiError(error);
      } else setFailure("บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (loading) return <p role="status"><PortalText>กำลังโหลดโปรไฟล์</PortalText></p>;
  if (!preview && !profile) return <div className="profile-panel profile-load-error">
    <ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}
    <button type="button" className="intake-button" onClick={() => setAttempt(value => value + 1)}><PortalText>โหลดโปรไฟล์อีกครั้ง</PortalText></button>
  </div>;
  return <>
    {preview && <p className="profile-preview" role="note"><PortalText>โปรไฟล์ใช้ได้เมื่อเข้าสู่ระบบด้วยบัญชีจริง โหมดตัวอย่างไม่โหลดหรือแก้ไขข้อมูลบัญชี</PortalText></p>}
    <div className="profile-columns">
      <section className="profile-panel" aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading"><PortalText>ข้อมูลส่วนตัว</PortalText></h2>
        {profile && <dl className="profile-metadata">
          <div><dt><PortalText>ชื่อผู้ใช้</PortalText></dt><dd>{profile.username}</dd></div>
          <div><dt><PortalText>สถานะบัญชี</PortalText></dt><dd>{profile.status === "active" ? t("ใช้งานอยู่") : profile.status === "inactive" ? t("ปิดใช้งาน") : profile.status}</dd></div>
          <div><dt><PortalText>วันที่สร้างบัญชี</PortalText></dt><dd><PortalDate value={profile.created_at * 1000} /></dd></div>
        </dl>}
        <form noValidate onSubmit={save} aria-label={t("แก้ไขโปรไฟล์")} aria-busy={saving}>
          <fieldset disabled={preview || saving || passwordPending} className="profile-fields">
            {fields.map(field => {
              const id = `profile-${field.name}`;
              const invalid = !!(errors[field.name]?.length || apiError?.fieldErrors[field.name]?.length);
              return <div key={field.name} className={`profile-field${field.name === "email" || field.name === "phone_number" ? " profile-wide" : ""}`}>
                <label htmlFor={id}>{t(field.label)}</label>
                <input id={id} name={field.name} type={field.type} autoComplete={field.autoComplete} inputMode={field.name === "phone_number" ? "numeric" : undefined} required={field.name !== "phone_number"} value={values[field.name]} aria-invalid={invalid} aria-describedby={invalid ? `${id}-errors` : undefined} onChange={event => { setValues(current => ({ ...current, [field.name]: event.target.value })); setSaved(false); }} />
                {errors[field.name]?.length ? <div id={`${id}-errors`} role="alert" className="profile-field-error">{errors[field.name].map(message => <p key={message}>{t(message)}</p>)}</div> : <div className="profile-field-error"><ApiFieldErrors id={`${id}-errors`} field={field.name} error={apiError} /></div>}
              </div>;
            })}
            <div className="profile-wide profile-feedback"><ApiErrorNotice error={apiError} />{failure && <p role="alert">{t(failure)}</p>}{saved && <p role="status" className="profile-success"><PortalText>บันทึกโปรไฟล์แล้ว</PortalText></p>}</div>
            <div className="profile-wide profile-actions">
              <button type="submit" className="profile-save" disabled={!dirty}>{t(saving ? "กำลังบันทึก" : "บันทึกโปรไฟล์")}</button>
              <button type="button" className="profile-discard" disabled={!dirty} onClick={discard}><PortalText>ยกเลิกการแก้ไข</PortalText></button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="profile-panel" aria-labelledby="profile-password-heading">
        <h2 id="profile-password-heading"><PortalText>เปลี่ยนรหัสผ่าน</PortalText></h2>
        <ChangePasswordForm purpose="profile" disabled={preview || saving} onPendingChange={setPasswordPending} />
      </section>
    </div>
  </>;
}
