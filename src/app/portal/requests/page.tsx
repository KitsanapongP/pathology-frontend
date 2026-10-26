import type { Metadata } from "next";
import RequestIntake from "@/components/request-intake";

export const metadata: Metadata = { title: "รับใบส่งตรวจ | Pathology" };

export default function RequestsPage() {
  return <RequestIntake />;
}
