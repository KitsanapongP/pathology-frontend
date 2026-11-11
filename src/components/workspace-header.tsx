"use client";

import Link from "next/link";
import PortalBrand from "./portal-brand";
import LogoutButton from "./logout-button";
import { usePortalLanguage } from "./portal-preferences";
import PortalFontControl from "./portal-font-control";

export default function WorkspaceHeader() {
  const { t, language, setLanguage } = usePortalLanguage();
  return <header className="portal-global-header">
    <div className="portal-global-topbar">
      <Link href="/portal" aria-label={t("หน้าแรก")}><PortalBrand /></Link>
      <div className="portal-preferences">
        <PortalFontControl />
        <button type="button" role="switch" aria-label={t("ใช้ภาษาอังกฤษ")} aria-checked={language === "en"} title={t(language === "th" ? "เปลี่ยนเป็นภาษาอังกฤษ" : "เปลี่ยนเป็นภาษาไทย")} className="portal-language-switch" onClick={() => setLanguage(language === "th" ? "en" : "th")}>
          <span className="portal-language-thumb" aria-hidden="true" />
          <span className="portal-language-flag" aria-hidden="true"><svg viewBox="0 0 60 40"><path fill="#a51931" d="M0 0h60v40H0z"/><path fill="#fff" d="M0 7h60v26H0z"/><path fill="#2d2a4a" d="M0 13h60v14H0z"/></svg></span>
          <span className="portal-language-flag" aria-hidden="true"><svg viewBox="0 0 60 40"><path fill="#012169" d="M0 0h60v40H0z"/><path stroke="#fff" strokeWidth="10" d="m0 0 60 40M60 0 0 40"/><path stroke="#c8102e" strokeWidth="4" d="m0 0 60 40M60 0 0 40"/><path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60"/><path stroke="#c8102e" strokeWidth="7" d="M30 0v40M0 20h60"/></svg></span>
        </button>
        <LogoutButton className="portal-signout" />
      </div>
    </div>
  </header>;
}
