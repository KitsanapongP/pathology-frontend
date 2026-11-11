"use client";

import { useRouter } from "next/navigation";
import { enterDemo, isDemoAuth, type DemoRole } from "@/lib/demo-session";
import { portalSession } from "@/lib/portal-api";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";

export default function DemoLoginShortcuts() {
  const router = useRouter();
  const { t } = usePortalLanguage();
  function enter(role: DemoRole) {
    if (portalSession.getSnapshot() === "password-required") return;
    portalSession.clear();
    enterDemo(role);
    router.replace(role === "admin" ? "/portal/admin" : "/portal");
  }
  if (!isDemoAuth()) return null;
  const buttonClass = "inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#b8cbea] bg-white/90 px-2.5 py-1.5 text-xs text-[#164579] shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  return <div role="group" aria-label={t("ข้ามการเข้าสู่ระบบ")} className="z-20 mt-4 flex flex-wrap justify-end gap-2 self-end sm:fixed sm:bottom-4 sm:right-4 sm:mt-0">
    <button type="button" aria-label={t("ข้ามการเข้าสู่ระบบ Student / Professor")} onClick={() => enter("workspace")} className={buttonClass}><PortalIcon name="users" className="size-4" /><PortalText>ข้าม · Student / Professor</PortalText></button>
    <button type="button" aria-label={t("ข้ามการเข้าสู่ระบบ Admin")} onClick={() => enter("admin")} className={buttonClass}><PortalIcon name="shield" className="size-4" /><PortalText>ข้าม · Admin</PortalText></button>
  </div>;
}
