import type { Metadata } from "next";
import SlideMatching from "@/components/slide-matching";

export const metadata: Metadata = { title: "จับคู่สไลด์และคาสเซ็ต | Pathology" };

export default function MatchingPage() {
  return <SlideMatching />;
}
