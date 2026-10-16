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
  ocr: OcrStatus;
  review: ReviewStatus;
  file?: File;
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
      patientName: "",
      uploadedAt: `2026-10-${String(i < 12 ? 16 : Math.max(1, 15 - Math.floor((i - 12) / 4))).padStart(2, "0")}T${i < 12 ? `${String(Math.max(0, 10 - i)).padStart(2, "0")}:${i === 0 ? "24" : "18"}` : "14:20"}:00+07:00`,
      ocr,
      review,
    };
  });
}

export const requestTemplates = [
  { title: "แบบฟอร์มคำร้องทั่วไป", file: "general-request", color: "blue" },
  { title: "แบบฟอร์มคำร้องขอใช้บริการต่าง ๆ", file: "service-request", color: "green" },
  { title: "แบบฟอร์มส่งตรวจทางพยาธิวิทยา", file: "examination-request", color: "orange" },
  { title: "แบบฟอร์มคำร้องขอแก้ไขข้อมูล", file: "correction-request", color: "red" },
];
