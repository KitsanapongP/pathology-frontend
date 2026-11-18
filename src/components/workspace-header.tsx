"use client";

import Link from "next/link";
import PortalBrand from "./portal-brand";
import LogoutButton from "./logout-button";
import { usePortalLanguage } from "./portal-preferences";
import PortalFontControl from "./portal-font-control";
import PortalLanguageControl from "./portal-language-control";

export default function WorkspaceHeader() {
  const { t } = usePortalLanguage();
  return <header className="portal-global-header">
    <div className="portal-global-topbar">
      <Link href="/portal" aria-label={t("หน้าแรก")}><PortalBrand /></Link>
      <div className="portal-preferences">
        <PortalFontControl />
        <PortalLanguageControl />
        <LogoutButton className="portal-signout" />
      </div>
    </div>
  </header>;
}
