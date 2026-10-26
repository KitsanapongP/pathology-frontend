import { mockPatientName } from "./mock-patient";
import { ocrExample } from "./ocr-examples";
import { examinationOptions } from "./ocr-result";
import type { OcrResult, PathologyFields } from "./ocr-result";

export type OcrStatus = "สแกนแล้ว" | "กำลังดำเนินงาน" | "ไม่สามารถสแกนได้" | "รอประมวลผล";
export type ReviewStatus = "รอตรวจสอบ" | "พร้อมใช้งาน" | "ต้องแก้ไข" | "รอผล OCR";

export type RequestRecord = {
  id: string;
  category: string;
  sender: string;
  fileName: string;
  hn: string;
  patientName: string;
  uploadedAt: string;
  receivedAt?: string;
  ocr: OcrStatus;
  review: ReviewStatus;
  file?: File;
  ocrResult?: OcrResult;
  pathology?: PathologyFields;
};

// Local fixtures until the requests API is connected.
export function initialRequests(): RequestRecord[] {
  const senders = ["ศุภวิชญ์ ใจดี", "จิราพร มั่นคง", "อนุชา พัฒนศรี", "กมลชนก ราชินี", "ศิริพงศ์ สอนดี", "อภิชา เกษมสุข", "ธนวัฒน์ ศรีสกุล", "สุนารี อินทร์ดี"];
  const categories = ["คำร้องทั่วไป", "ขอใช้บริการ", "ส่งตรวจ"];
  return Array.from({ length: 41 }, (_, i) => {
    const number = String(42 - i).padStart(4, "0");
    const ocr: OcrStatus = i === 5 || i === 37 ? "ไม่สามารถสแกนได้" : i === 3 || i > 25 ? "กำลังดำเนินงาน" : "สแกนแล้ว";
    const review: ReviewStatus = [0, 7, 14, 20, 24].includes(i) ? "รอตรวจสอบ" : i === 2 || ocr === "ไม่สามารถสแกนได้" ? "ต้องแก้ไข" : ocr === "สแกนแล้ว" ? "พร้อมใช้งาน" : "รอผล OCR";
    return {
      id: `REQ-2569-${number}`,
      category: categories[i % categories.length],
      sender: senders[i % senders.length],
      fileName: `request-${number}.pdf`,
      hn: `HN${String(100001 + i)}`,
      patientName: mockPatientName(i),
      uploadedAt: `2026-10-${String(i < 12 ? 16 : Math.max(1, 15 - Math.floor((i - 12) / 4))).padStart(2, "0")}T${i < 12 ? `${String(Math.max(0, 10 - i)).padStart(2, "0")}:${i === 0 ? "24" : "18"}` : "14:20"}:00+07:00`,
      receivedAt: `2026-10-${String(25 - Math.floor(i / 6)).padStart(2, "0")}T${String(10 - i % 6).padStart(2, "0")}:20:00+07:00`,
      pathology: { accessionNumber: `S69-TEST-${number}`, an: i % 3 === 0 ? `AN-TEST-${number}` : "",
        age: `${30 + i % 35} ปี`, sex: i % 2 ? "ชาย" : "หญิง", hospital: "โรงพยาบาลสมมติ",
        ward: ["OPD", "Ward A", "Ward B"][i % 3], requestingDoctor: "พญ. อรุณี แพทย์สมมติ",
        collector: "เจ้าหน้าที่สมมติ", collectedAt: "", tests: [examinationOptions[i % examinationOptions.length]],
        specimen: "ตัวอย่างสิ่งส่งตรวจสมมติ", specimenCount: String(i % 3 + 1), operations: ["Core biopsy"] },
      ocr,
      review,
      ...(i < 4 ? (() => {
        const example = ocrExample(i);
        return { patientName: example.patientName, hn: example.hn, fileName: example.result.file,
          category: "ส่งตรวจ", sender: "เจ้าหน้าที่รับคำร้อง", uploadedAt: "2026-10-24T08:55:00+07:00",
          ocr: "สแกนแล้ว" as const, review: "รอตรวจสอบ" as const, ocrResult: example.result, pathology: { ...example.fieldDraft, ward: ["OPD", "Ward A", "Ward B"][i % 3], tests: [["Cell block", "Routine histology", "Frozen section", "Kidney biopsy"][i]], operations: ["Core biopsy"], collector: "เจ้าหน้าที่สมมติ", specimenCount: String(i + 1) } };
      })() : {}),
    };
  });
}
