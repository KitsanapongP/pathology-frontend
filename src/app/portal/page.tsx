import type { Metadata } from "next";
import WorkspacePortal from "@/components/workspace-portal";

export const metadata: Metadata = {
  title: "Student / Professor Portal | Pathology",
};

export default function PortalPage() {
  return <WorkspacePortal />;
}
