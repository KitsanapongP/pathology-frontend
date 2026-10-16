"use client";

import Link from "next/link";
import { useState } from "react";
import PortalBrand from "./portal-brand";
import PortalIcon from "./portal-icon";

export default function WorkspaceHeader() {
  const [accountMenu, setAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  return (
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
  );
}
