"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import PortalBrand from "./portal-brand";
import PortalIcon, { type PortalIconName } from "./portal-icon";

const modules: { number: string; title: string; lines: string[]; icon: PortalIconName; color: string }[] = [
  { number: "01", title: "รับใบคำร้อง", lines: ["สแกนเอกสารด้วย OCR", "และตรวจสอบข้อมูล"], icon: "scan", color: "blue" },
  { number: "02", title: "บันทึกผลการตรวจ", lines: ["บันทึกเสียงระหว่างการตรวจ", "ด้วยระบบ Speech to Text"], icon: "microphone", color: "green" },
  { number: "03", title: "จับคู่สไลด์และคาสเซ็ต", lines: ["อ่านบาร์โค้ดและจับคู่คำร้อง", "กับข้อมูลการตรวจ"], icon: "barcode", color: "orange" },
  { number: "04", title: "คลังข้อมูล", lines: ["ค้นหาและดูข้อมูลใบคำร้อง", "และผลการตรวจ"], icon: "archive", color: "purple" },
];

export default function WorkspacePortal() {
  const [accountMenu, setAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [selected, setSelected] = useState<(typeof modules)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function openModule(module: (typeof modules)[number]) {
    setSelected(module);
    setAccountMenu(false);
    setNotifications(false);
    dialog.current?.showModal();
  }

  return (
    <div className="workspace-shell min-h-svh text-[#102d60]">
      <header className="workspace-topbar relative z-20 flex min-h-[84px] items-center justify-between gap-4 border-b border-white/60 bg-white/95 px-5 shadow-[0_3px_24px_rgba(31,65,105,0.04)] sm:px-8 lg:px-14">
        <PortalBrand />
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="relative">
            <button type="button" aria-label="การแจ้งเตือน" aria-expanded={notifications} onClick={() => { setNotifications(!notifications); setAccountMenu(false); }} className="portal-icon-button relative text-[#12346e]">
              <PortalIcon name="bell" className="size-6" />
              <span className="absolute right-1 top-0 size-2.5 rounded-full border-2 border-white bg-[#ee4e59]" />
            </button>
            {notifications && <div className="portal-dropdown right-0 w-64"><p className="border-b border-[#edf1f7] px-4 py-3 text-sm font-semibold">การแจ้งเตือน</p><p className="px-4 py-4 text-sm leading-6 text-[#7385a1]">ยินดีต้อนรับสู่ระบบพยาธิวิทยา</p></div>}
          </div>
          <div className="h-10 w-px bg-[#d9e2ef]" />
          <div className="relative">
            <button type="button" aria-label="เมนูบัญชี Student / Professor" aria-expanded={accountMenu} onClick={() => { setAccountMenu(!accountMenu); setNotifications(false); }} className="flex items-center gap-3 rounded-lg py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600">
              <span className="workspace-avatar flex size-11 items-center justify-center overflow-hidden rounded-full bg-[#e1e9f6]">
                <svg viewBox="0 0 44 44" fill="none" aria-hidden="true" className="size-11"><path d="M5 44c1-11 8-17 17-17s16 6 17 17" fill="#163c76" /><path d="m16 28 6 12 6-12" fill="white" /><path d="M18 23h8v8l-4 4-4-4v-8Z" fill="#e0c3ac" /><path d="M13 14c0-8 18-8 18 0v5c0 7-4 11-9 11s-9-4-9-11v-5Z" fill="#f4e8df" /><path d="M12 16C10 3 33 2 32 16l-6-5c-3 3-8 3-14 2v3Z" fill="#183a6c" /><path d="m20 35 2-2 2 2-1 9h-2l-1-9Z" fill="#8caccb" /></svg>
              </span>
              <span className="hidden sm:block"><span className="block text-sm font-semibold">ผู้ใช้งาน</span><span className="mt-0.5 block text-xs text-[#7b8caa]">Student / Professor</span></span>
              <PortalIcon name="chevron" className="ml-1 size-3.5 rotate-90" />
            </button>
            {accountMenu && <div className="portal-dropdown right-0 w-60"><div className="border-b border-[#edf1f7] px-4 py-3"><p className="text-sm font-semibold">ผู้ใช้งาน</p><p className="mt-1 text-xs text-[#8090aa]">Student / Professor</p></div><Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50"><PortalIcon name="logout" className="size-4" />ออกจากระบบ</Link></div>}
          </div>
        </div>
      </header>

      <main className="workspace-main flex min-h-[calc(100svh-84px)] items-center justify-center px-5 py-12 sm:px-8 lg:py-20">
        <div className="w-full max-w-[1104px]">
          <header className="workspace-welcome mb-10 text-center lg:mb-12">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#09285e] sm:text-5xl lg:text-[50px]">ยินดีต้อนรับ</h1>
            <p className="mt-3 text-base text-[#798ba8] sm:text-xl lg:text-[23px]">กรุณาเลือกเมนูเพื่อเริ่มใช้งานระบบ</p>
          </header>
          <section aria-label="เมนูการใช้งานระบบพยาธิวิทยา" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-7">
            {modules.map(module => <button type="button" key={module.number} onClick={() => openModule(module)} className={`workspace-module module-${module.color} group relative grid min-h-[220px] grid-cols-[128px_minmax(0,1fr)_56px] items-center gap-6 rounded-[22px] border border-white/85 bg-white/95 px-9 py-9 text-left shadow-[0_12px_32px_rgba(47,76,112,0.06)] transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_rgba(47,76,112,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600`}>
              <span className="workspace-module-number absolute left-7 top-6 text-lg font-semibold">{module.number}</span>
              <span className="workspace-module-icon flex size-32 items-center justify-center rounded-[21px]"><PortalIcon name={module.icon} className="size-[76px]" style={{ strokeWidth: 1.5 }} /></span>
              <span className="workspace-module-copy min-w-0"><span className="block text-[22px] font-bold leading-[1.5] tracking-tight text-[#0b285e]">{module.title}</span><span className="mt-2 block text-[17px] leading-[1.7] text-[#7186a6]">{module.lines.map(line => <span className="block" key={line}>{line}</span>)}</span></span>
              <span className="workspace-module-arrow flex size-14 items-center justify-center rounded-full transition group-hover:translate-x-1"><PortalIcon name="arrow" className="size-7" /></span>
            </button>)}
          </section>
        </div>
      </main>

      <dialog ref={dialog} aria-labelledby="workspace-module-heading" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[#dce6f3] bg-white p-0 text-[#24416b] shadow-2xl backdrop:bg-[#102b50]/35 backdrop:backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5"><h2 id="workspace-module-heading" className="text-lg font-bold text-[#0c285d]">{selected?.title}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="ปิดหน้าต่าง" className="portal-icon-button"><PortalIcon name="close" /></button></div>
        <div className="px-6 py-7"><p className="text-sm leading-7 text-[#7285a1]">โมดูลนี้อยู่ระหว่างการพัฒนา กรุณากลับมาใช้งานอีกครั้งในภายหลัง</p><button type="button" onClick={() => dialog.current?.close()} className="mt-6 rounded-lg bg-[#123e7c] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0c2e61]">กลับไปหน้า Portal</button></div>
      </dialog>
    </div>
  );
}

