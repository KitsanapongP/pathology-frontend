import type { Metadata } from "next";
import ExaminationWorkflow from "@/components/examination-workflow";

export const metadata: Metadata = { title: "บันทึกผลการตรวจ | Pathology" };

export default function ExaminationPage() {
  return <ExaminationWorkflow />;
}
