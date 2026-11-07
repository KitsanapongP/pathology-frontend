"use client";

import { usePathname } from "next/navigation";
import WorkspaceHeader from "./workspace-header";

export default function PortalFrame({ children }: { children: React.ReactNode }) {
  const isExamination = usePathname() === "/portal/examinations";
  return <div className={`portal-frame${isExamination ? " portal-frame--station" : ""}`}>
    {!isExamination && <WorkspaceHeader />}
    {children}
  </div>;
}
