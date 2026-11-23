import type { Metadata } from "next";
import localFont from "next/font/local";
import ExaminationWorkflow from "@/components/examination-workflow";
import "./station.css";

const examinationReadingFont = localFont({
  src: "./NotoSansThaiLooped.ttf",
  weight: "100 900",
  variable: "--font-examination-reading",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = { title: "บันทึกผลการตรวจ | Pathology" };

export default function ExaminationPage() {
  return <ExaminationWorkflow readingFontClassName={examinationReadingFont.variable} />;
}
