"use client";

import { portalSession } from "@/lib/portal-api";
import { PortalText } from "./portal-preferences";
import PortalIcon from "./portal-icon";
import { isDemoAuth, leaveDemo } from "@/lib/demo-session";

export default function LogoutButton({ className }: { className?: string }) {
  return <button type="button" className={className} onClick={() => { if (isDemoAuth()) leaveDemo(); else void portalSession.logout().catch(() => {}); }}><PortalIcon name="logout" /><span><PortalText>ออกจากระบบ</PortalText></span></button>;
}
