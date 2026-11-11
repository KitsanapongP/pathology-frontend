import type { Metadata } from "next";
import PortalPreferences from "@/components/portal-preferences";
import PortalFrame from "@/components/portal-frame";

export const metadata: Metadata = {
  title: "Portal | Pathology",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalPreferences><PortalFrame>{children}</PortalFrame></PortalPreferences>;
}
