"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { demoSnapshot, isDemoAuth, subscribeDemo, type DemoState } from "@/lib/demo-session";
import { portalSession } from "@/lib/portal-api";
import type { SessionState } from "@/lib/session-manager";
import LogoutButton from "./logout-button";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";
import { usePortalSettings } from "./portal-settings";

export default function PortalAccountMenu() {
  const { t } = usePortalLanguage();
  const openSettings = usePortalSettings();
  const session = useSyncExternalStore<SessionState>(portalSession.subscribe, portalSession.getSnapshot, () => "checking");
  const demo = useSyncExternalStore<DemoState>(subscribeDemo, demoSnapshot, () => "checking");
  const previewAdmin = isDemoAuth() && demo === "admin" && session !== "authenticated" && session !== "password-required";
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("popstate", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("popstate", close);
    };
  }, [open]);
  return <div ref={container} className="portal-account-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="portal-account-trigger" aria-label={t("เมนูบัญชีผู้ใช้")} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <span className="portal-account-avatar">{previewAdmin ? "AD" : <PortalIcon name="user" />}</span>
      <span className="portal-account-copy"><span>{previewAdmin ? "Admin" : t("บัญชีผู้ใช้")}</span>{previewAdmin && <span className="portal-account-role"><PortalText>ผู้ดูแลระบบ</PortalText></span>}</span>
      <PortalIcon name="chevron" className="portal-account-chevron" />
    </button>
    {open && <nav id={id} aria-label={t("เมนูบัญชีผู้ใช้")} className="portal-dropdown portal-account-dropdown">
      <Link href="/portal/profile" onClick={() => setOpen(false)}><PortalIcon name="users" /><PortalText>โปรไฟล์ของฉัน</PortalText></Link>
      <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); openSettings(); }}><PortalIcon name="settings" /><PortalText>ตั้งค่าระบบ</PortalText></button>
      <LogoutButton />
    </nav>}
  </div>;
}
