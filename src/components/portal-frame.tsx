"use client";

import { usePathname } from "next/navigation";
import WorkspaceHeader from "./workspace-header";

export default function PortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/\/+$/, "");
  const isExamination = pathname === "/portal/examinations";
  return <div className={`portal-frame${isExamination ? " portal-frame--station" : ""}`}>
    {!isExamination && <WorkspaceHeader />}
    {children}
  </div>;
}
