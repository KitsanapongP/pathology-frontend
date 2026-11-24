"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import PortalIcon from "./portal-icon";
import { usePortalSettings } from "./portal-settings";
import { PortalText, usePortalLanguage } from "./portal-preferences";

const navigation = [
  { href: "/portal/admin", label: "แดชบอร์ด", icon: "home" },
  { href: "/portal/admin/users", label: "จัดการผู้ใช้", icon: "users" },
  { href: "/portal/admin/requests", label: "จัดการคำร้อง", icon: "file" },
  { href: "/portal/admin/storage", label: "จัดการคลังข้อมูล", icon: "database" },
  { href: "/portal/admin/logs", label: "ตรวจสอบล็อกและเซอร์วิส", icon: "chart" },
] as const;

function AdminNavigation({ onNavigate, onSettings }: { onNavigate: () => void; onSettings: () => void }) {
  const { t } = usePortalLanguage();
  const pathname = usePathname().replace(/\/+$/, "");
  return <nav aria-label={t("เมนูหลัก")} className="admin-navigation">
    {navigation.map(item => <Link href={item.href} key={item.href} onClick={onNavigate} aria-current={pathname === item.href ? "page" : undefined} className="portal-nav-item"><PortalIcon name={item.icon} className="size-[21px] shrink-0" /><span><PortalText>{item.label}</PortalText></span></Link>)}
    <div className="my-4 h-px bg-[#dce5f1]" />
    <button onClick={onSettings} className="portal-nav-item"><PortalIcon name="settings" className="size-[21px] shrink-0" /><PortalText>ตั้งค่าระบบ</PortalText></button>
  </nav>;
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const { t } = usePortalLanguage();
  const openSettings = usePortalSettings();
  const [mobileMenu, setMobileMenu] = useState(false);
  const menuDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileMenu) menuDialog.current?.showModal();
    else menuDialog.current?.close();
  }, [mobileMenu]);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const closeMenu = () => { if (wide.matches) setMobileMenu(false); };
    wide.addEventListener("change", closeMenu);
    return () => wide.removeEventListener("change", closeMenu);
  }, []);
  function showSettings() { menuDialog.current?.close(); setMobileMenu(false); openSettings(); }
  const nav = <AdminNavigation onNavigate={() => setMobileMenu(false)} onSettings={showSettings} />;
  return <div className="portal-shell admin-shell min-h-svh bg-[#edf3f9] text-[#29436b]">
    <div className="portal-topbar admin-menu-toolbar">
      <button onClick={() => setMobileMenu(!mobileMenu)} aria-expanded={mobileMenu} aria-controls="admin-mobile-navigation" aria-label={t("เปิดเมนู")} className="portal-icon-button"><PortalIcon name={mobileMenu ? "close" : "menu"} /></button>
    </div>

    <aside className="admin-sidebar">{nav}<div className="portal-sidebar-campus min-h-32 flex-1" aria-hidden="true" /></aside>
    <dialog ref={menuDialog} id="admin-mobile-navigation" className="admin-mobile-navigation" aria-label={t("เมนูหลัก")} onCancel={() => setMobileMenu(false)} onClick={event => { if (event.target === event.currentTarget) setMobileMenu(false); }}>
      <div className="admin-mobile-heading"><span><PortalText>เมนูหลัก</PortalText></span><button className="portal-icon-button" aria-label={t("ปิดเมนู")} onClick={() => setMobileMenu(false)}><PortalIcon name="close" /></button></div>
      {nav}
    </dialog>
    {children}
  </div>;
}
