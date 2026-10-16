"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`size-5 shrink-0 ${className}`}>
      {children}
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Demo navigation only. No credentials are sent or stored.
    router.push("/portal");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8" aria-label="เข้าสู่ระบบพยาธิวิทยา">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#102d58]">ชื่อผู้ใช้ / อีเมล</label>
        <div className="login-field">
          <Icon><path d="M20 21v-2a7 7 0 0 0-14 0v2" /><circle cx="13" cy="7" r="4" /></Icon>
          <input id="username" name="username" type="text" autoComplete="username" placeholder="ระบุชื่อผู้ใช้หรืออีเมลของคุณ" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#102d58] outline-none placeholder:text-[#8795ac]" />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#102d58]">รหัสผ่าน</label>
        <div className="login-field">
          <Icon><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></Icon>
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="ระบุรหัสผ่านของคุณ" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#102d58] outline-none placeholder:text-[#8795ac]" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} className="rounded p-1.5 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Icon><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</Icon>
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button type="button" aria-expanded={showHelp} aria-controls="password-help" onClick={() => setShowHelp(!showHelp)} className="rounded text-sm font-medium text-[#1556b8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">ลืมรหัสผ่าน?</button>
      </div>
      {showHelp && <p id="password-help" role="status" className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-[#516482]">ขณะนี้เป็นระบบสาธิต สามารถกดเข้าสู่ระบบได้โดยไม่ต้องกรอกชื่อผู้ใช้และรหัสผ่าน</p>}

      <button type="submit" className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-[#123e7c] to-[#082958] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
        <Icon><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5M3 12h13m-5-5 5 5-5 5" /></Icon>
        เข้าสู่ระบบ
      </button>

      <div className="my-4 flex items-center gap-3 text-sm text-[#71809a]"><span className="h-px flex-1 bg-[#dce3ed]" />หรือ<span className="h-px flex-1 bg-[#dce3ed]" /></div>

      <button type="button" disabled className="flex min-h-16 w-full items-center justify-center gap-3 rounded-lg border border-[#b9cdec] bg-[#edf4ff] px-4 py-2.5 text-[#536c90] disabled:cursor-not-allowed">
        <Icon className="size-7"><path d="m2 8 10-5 10 5H2Zm2 12h16M2 23h20M5 11v6m5-6v6m4-6v6m5-6v6" /></Icon>
        <span className="text-left"><span className="block text-base font-semibold">เข้าสู่ระบบด้วย SSO</span><span className="mt-0.5 block text-xs">สำหรับบุคลากรของหน่วยงาน · เร็ว ๆ นี้</span></span>
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-[#77859b]">โหมดสาธิต · กดเข้าสู่ระบบได้โดยไม่ต้องกรอกข้อมูล</p>
    </form>
  );
}
