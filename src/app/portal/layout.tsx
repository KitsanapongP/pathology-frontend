import type { Metadata } from "next";
import PortalPreferences from "@/components/portal-preferences";
import WorkspaceHeader from "@/components/workspace-header";

export const metadata: Metadata = {
  title: "Portal | Pathology",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalPreferences><div className="portal-frame"><WorkspaceHeader />{children}</div></PortalPreferences>;
}
