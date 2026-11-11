"use client";

import { useRouter } from "next/navigation";
import { enterDemo, type DemoRole } from "@/lib/demo-session";
import PortalIcon from "./portal-icon";
import { PortalText } from "./portal-preferences";

export default function DemoLoginForm() {
  const router = useRouter();
  function enter(role: DemoRole) {
    enterDemo(role);
    router.replace(role === "admin" ? "/portal/admin" : "/portal");
  }
  return <div className="mt-8 space-y-3">
    <button type="button" onClick={() => enter("workspace")} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-[#123e7c] to-[#082958] px-4 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><PortalIcon name="users" /><PortalText>เข้าสู่ระบบ Student / Professor</PortalText></button>
    <button type="button" onClick={() => enter("admin")} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#b8cbea] bg-[#f2f6fc] px-4 py-3 text-sm font-semibold text-[#164579] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><PortalIcon name="shield" /><PortalText>เข้าสู่ระบบ Admin</PortalText></button>
  </div>;
}
