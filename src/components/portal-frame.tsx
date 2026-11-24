"use client";

import { usePathname } from "next/navigation";
import WorkspaceHeader from "./workspace-header";
import PortalSettingsProvider from "./portal-settings";

export default function PortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/\/+$/, "");
  const isExamination = pathname === "/portal/examinations";
  return <PortalSettingsProvider><div className={`portal-frame${isExamination ? " portal-frame--station" : ""}`}>
    {!isExamination && <WorkspaceHeader />}
    {children}
  </div></PortalSettingsProvider>;
}
