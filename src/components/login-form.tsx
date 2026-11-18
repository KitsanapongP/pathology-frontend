"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiErrorMessage, type FieldErrors } from "@/lib/api-client";
import { portalApi, portalSession } from "@/lib/portal-api";
import { passwordChangePath, type SessionTokens } from "@/lib/session-manager";
import LoginNotice from "./login-notice";
import PasswordField from "./password-field";
import { usePortalLanguage } from "./portal-preferences";

// รหัสโรงพยาบาล (tenant_code) ล่าสุดที่ login สำเร็จ — ไม่ใช่ข้อมูลลับ จำไว้ให้ไม่ต้องพิมพ์ซ้ำ
const tenantCodeKey = "pathology:tenant-code:v1";
function readTenantCode() {
  try { return localStorage.getItem(tenantCodeKey) ?? ""; } catch { return ""; }
}
function saveTenantCode(value: string) {
  try { localStorage.setItem(tenantCodeKey, value); } catch { /* Remembering the code is only a convenience. */ }
}

// Hospital selection is temporarily hidden. Resolve only a sole or remembered hospital.
// Never guess a tenant or remove it from the login API contract.
type LoginTenant = { code: string; name: string };

export default function LoginForm() {
  const { t } = usePortalLanguage();
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    const saved = readTenantCode();
    portalApi.request<LoginTenant[]>("auth/tenants", { auth: false, signal: controller.signal }).then(response => {
      const tenants = Array.isArray(response.data) ? response.data : [];
      if (!tenants.length) throw new Error("no login tenants");
      const remembered = tenants.find(tenant => tenant.code === saved);
      setTenantCode(current => current || remembered?.code || (tenants.length === 1 ? tenants[0].code : ""));
    }).catch(() => {
      if (controller.signal.aborted) return;
      if (saved) setTenantCode(current => current || saved);
    });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const next: FieldErrors = {};
    if (!tenantCode.trim() || Array.from(tenantCode.trim()).length > 100) next.tenant_code = [t("ยังไม่สามารถระบุโรงพยาบาลสำหรับเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ")];
    if (!username.trim()) next.username = [t("กรุณาระบุชื่อผู้ใช้")];
    else if (Array.from(username.trim()).length > 100) next.username = [t("ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร")];
    if (!password) next.password = [t("กรุณาระบุรหัสผ่าน")];
    else if (Array.from(password).length > 256) next.password = [t("รหัสผ่านต้องไม่เกิน 256 ตัวอักษร")];
    setErrors(next); setApiError(null); setFeedback("");
    if (Object.keys(next).length) return;
    const controller = new AbortController(); request.current = controller; setPending(true);
    const startedAt = Date.now();
    const generation = portalSession.getGeneration();
    try {
      const response = await portalApi.request<SessionTokens>("auth/login", {
        method: "POST", auth: false, body: { tenant_code: tenantCode.trim(), username: username.trim(), password }, signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (generation !== portalSession.getGeneration()) return;
      portalSession.accept(response.data, startedAt);
      saveTenantCode(tenantCode.trim());
      setPassword("");
      router.replace(response.data.must_change_password ? passwordChangePath : "/portal");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        setApiError(error); setErrors(error.fieldErrors);
        if (error.errorCode === "auth.invalid_credentials") setFeedback(t("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
      } else setFeedback(t("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  const message = feedback || errors.tenant_code?.join(" · ") || (apiError ? apiErrorMessage(apiError) : "");
  return <form noValidate onSubmit={submit} className="mt-7" aria-label={t("เข้าสู่ระบบพยาธิวิทยา")} aria-busy={pending} aria-describedby={message ? "login-error" : undefined}>
    <LoginNotice />
    <fieldset disabled={pending} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#102d58]">{t("ชื่อผู้ใช้")}</label>
        <div className="login-field"><input id="username" name="username" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false}
          value={username} onChange={event => setUsername(event.target.value)} aria-invalid={!!errors.username?.length} aria-describedby={errors.username?.length ? "username-errors" : undefined}
          className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#102d58] outline-none" /></div>
        {errors.username?.length ? <div id="username-errors" role="alert" className="mt-2 text-sm text-red-700">{errors.username.map((error, index) => <p key={index}>{error}</p>)}</div> : null}
      </div>
      <PasswordField id="password" label="รหัสผ่าน" value={password} onChange={setPassword} errors={errors.password} autoComplete="current-password" />
      {message && <p id="login-error" role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
      <button type="submit" className="min-h-12 w-full rounded-lg bg-[#10396f] px-4 py-3 text-base font-semibold text-white disabled:opacity-60">{t(pending ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ")}</button>
    </fieldset>
  </form>;
}
