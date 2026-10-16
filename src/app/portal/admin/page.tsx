import type { Metadata } from "next";
import PortalDashboard from "@/components/portal-dashboard";

export const metadata: Metadata = {
  title: "Admin Portal | Pathology",
};

export default function AdminPortalPage() {
  return <PortalDashboard />;
}
