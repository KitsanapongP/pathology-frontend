import type { Metadata } from "next";
import ExaminationWorkflow from "@/components/examination-workflow";
import "./station.css";

export const metadata: Metadata = { title: "บันทึกผลการตรวจ | Pathology" };

export default function ExaminationPage() {
  return <ExaminationWorkflow />;
}
