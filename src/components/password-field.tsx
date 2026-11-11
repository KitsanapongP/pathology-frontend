"use client";

import { useState } from "react";
import { usePortalLanguage } from "./portal-preferences";

export default function PasswordField({ id, label, value, onChange, errors, autoComplete, minLength }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  errors?: string[]; autoComplete: "current-password" | "new-password"; minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const { t } = usePortalLanguage();
  const hasErrors = !!errors?.length;
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#102d58]">{t(label)}</label>
    <div className="login-field">
      <input id={id} name={id} required minLength={minLength} type={visible ? "text" : "password"} autoComplete={autoComplete}
        value={value} onChange={event => onChange(event.target.value)} aria-invalid={hasErrors} aria-describedby={hasErrors ? `${id}-errors` : undefined}
        className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#102d58] outline-none" />
      <button type="button" aria-label={t(visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน")} aria-pressed={visible} onClick={() => setVisible(!visible)} className="rounded p-1.5 text-[#516482] focus-visible:outline-2 focus-visible:outline-blue-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className="size-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>
      </button>
    </div>
    {hasErrors && <div id={`${id}-errors`} role="alert" className="mt-2 text-sm text-red-700">{errors.map((error, index) => <p key={index}>{error}</p>)}</div>}
  </div>;
}
