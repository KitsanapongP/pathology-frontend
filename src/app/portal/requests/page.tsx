import type { Metadata } from "next";
import RequestIntake from "@/components/request-intake";

export const metadata: Metadata = { title: "รับใบคำร้อง | Pathology" };

export default function RequestsPage() {
  return <RequestIntake />;
}
