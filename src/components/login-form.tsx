"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiErrorMessage, type FieldErrors } from "@/lib/api-client";
import { portalApi, portalSession } from "@/lib/portal-api";
import { passwordChangePath, type SessionTokens } from "@/lib/session-manager";
import LoginNotice from "./login-notice";
import PasswordField from "./password-field";
import { usePortalLanguage } from "./portal-preferences";

export default function LoginForm() {
  const { t } = usePortalLanguage();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const next: FieldErrors = {};
    if (!username.trim()) next.username = [t("กรุณาระบุชื่อผู้ใช้")];
    if (!password) next.password = [t("กรุณาระบุรหัสผ่าน")];
    setErrors(next); setApiError(null); setFeedback("");
    if (Object.keys(next).length) return;
    const controller = new AbortController(); request.current = controller; setPending(true);
    const startedAt = Date.now();
    const generation = portalSession.getGeneration();
    try {
      const response = await portalApi.request<SessionTokens>("auth/login", {
        method: "POST", auth: false, body: { username: username.trim(), password }, signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (generation !== portalSession.getGeneration()) return;
      portalSession.accept(response.data, startedAt);
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
  const message = feedback || (apiError ? apiErrorMessage(apiError) : "");
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
