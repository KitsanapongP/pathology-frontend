"use client";

import Link from "next/link";
import PortalBrand from "./portal-brand";
import LogoutButton from "./logout-button";
import { usePortalLanguage } from "./portal-preferences";
import PortalFontControl from "./portal-font-control";
import PortalLanguageControl from "./portal-language-control";
import PortalIcon from "./portal-icon";

export default function WorkspaceHeader() {
  const { t } = usePortalLanguage();
  return <header className="portal-global-header">
    <div className="portal-global-topbar">
      <Link href="/portal" aria-label={t("หน้าแรก")}><PortalBrand /></Link>
      <div className="portal-preferences">
        <PortalFontControl />
        <PortalLanguageControl />
        <div className="portal-account-actions">
          <Link href="/portal/profile" className="portal-profile-link" aria-label={t("โปรไฟล์ของฉัน")} title={t("โปรไฟล์ของฉัน")}><PortalIcon name="user" /></Link>
          <LogoutButton className="portal-signout" />
        </div>
      </div>
    </div>
  </header>;
}
