"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";

const SettingsContext = createContext<(() => void) | null>(null);

export function usePortalSettings() {
  const open = useContext(SettingsContext);
  if (!open) throw new Error("Wrap portal settings controls in PortalSettingsProvider.");
  return open;
}

export default function PortalSettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  useEffect(() => {
    const close = () => setOpenPath(null);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);
  return <SettingsContext.Provider value={() => setOpenPath(pathname)}>
    {children}
    {openPath === pathname && <SettingsDialog onClose={() => setOpenPath(null)} />}
  </SettingsContext.Provider>;
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, language } = usePortalLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  function close() { dialog.current?.close(); onClose(); }
  return <dialog ref={dialog} className="portal-dialog admin-settings" aria-labelledby="portal-settings-heading" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5"><h2 id="portal-settings-heading" className="text-lg font-bold"><PortalText>ตั้งค่าระบบ</PortalText></h2><button className="portal-icon-button" aria-label={t("ปิดหน้าต่าง")} onClick={close}><PortalIcon name="close" /></button></div>
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 p-6 text-sm"><dt><PortalText>ชื่อระบบ</PortalText></dt><dd><PortalText>ระบบสารสนเทศงานพยาธิวิทยา</PortalText></dd><dt><PortalText>หน่วยงาน</PortalText></dt><dd><PortalText>ภาควิชาพยาธิวิทยา</PortalText></dd><dt><PortalText>ภาษา</PortalText></dt><dd>{t(language === "en" ? "ภาษาอังกฤษ" : "ภาษาไทย")}</dd><dt><PortalText>เขตเวลา</PortalText></dt><dd>Asia/Bangkok</dd></dl>
  </dialog>;
}
