import type { Metadata } from "next";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Pathology",
};

export default function LoginPage() {
  return (
    <main className="login-background relative isolate flex min-h-svh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <section aria-labelledby="login-heading" className="w-full max-w-[550px] overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_20px_65px_-15px_rgba(26,49,82,0.35)] backdrop-blur-sm">
        <div className="px-6 pb-6 pt-9 sm:px-11 sm:pt-10">
          <div className="mb-7 flex items-center justify-center gap-6 sm:gap-7" aria-label="Pathology Platform">
            <svg viewBox="0 0 80 88" fill="none" aria-hidden="true" className="h-[88px] w-20 shrink-0">
              <path d="M40 3 69 19v31c0 16-15 27-29 34C26 77 11 66 11 50V19L40 3Z" fill="#0b3267" stroke="#c6a15c" strokeWidth="2.5" />
              <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m40 22 11 7-11 18-11-7 11-18Z" /><path d="m33 43-4 7m19-14a16 16 0 0 1 6 13c0 10-7 16-17 16H26m6-13h15m-10 0v13m-13 6h32" /><path d="m40 22 3-5 11 7-3 5" /></g>
            </svg>
            <div className="h-20 w-px bg-[#d9e1ed]" />
            <div className="text-[#0c3065]">
              <p className="text-[26px] font-bold tracking-tight sm:text-[30px]">Pathology</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.25em] text-[#98763d] sm:text-xs">INFORMATION SYSTEM</p>
              <p className="mt-2 text-xs text-[#71809a]">ระบบสารสนเทศพยาธิวิทยา</p>
            </div>
          </div>
          <header className="text-center">
            <h1 id="login-heading" className="text-[30px] font-bold leading-tight tracking-tight text-[#0a2e62] sm:text-[34px]">เข้าสู่ระบบ</h1>
            <p className="mt-2 text-sm leading-6 text-[#74819a] sm:text-base">สำหรับระบบสารสนเทศงานพยาธิวิทยา</p>
          </header>
          <LoginForm />
        </div>
        <footer className="flex items-center justify-center gap-3 border-t border-[#e5eaf1] bg-[#f0f3f8]/90 px-6 py-5 sm:px-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6 shrink-0 text-[#607697]"><path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7l8-4Z" /><path d="m8 12 3 3 5-5" /></svg>
          <p className="text-xs leading-6 text-[#6b7b94]">ระบบนี้สำหรับบุคลากรและผู้ที่ได้รับอนุญาตเท่านั้น<br className="hidden sm:block" />เพื่อความปลอดภัยของข้อมูล กรุณาออกจากระบบทุกครั้งหลังใช้งาน</p>
        </footer>
      </section>
    </main>
  );
}
