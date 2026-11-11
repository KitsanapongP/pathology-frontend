"use client";

import { portalSession } from "@/lib/portal-api";
import { PortalText } from "./portal-preferences";
import PortalIcon from "./portal-icon";
import { demoSnapshot, isDemoAuth, leaveDemo } from "@/lib/demo-session";

export default function LogoutButton({ className }: { className?: string }) {
  function logout() {
    if (isDemoAuth()) {
      const state = portalSession.getSnapshot();
      const preview = state !== "authenticated" && state !== "password-required" && ["workspace", "admin"].includes(demoSnapshot());
      leaveDemo();
      if (preview) return;
    }
    void portalSession.logout().catch(() => {});
  }
  return <button type="button" className={className} onClick={logout}><PortalIcon name="logout" /><span><PortalText>ออกจากระบบ</PortalText></span></button>;
}
