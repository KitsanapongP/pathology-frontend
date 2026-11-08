import { initialRequests, type RequestRecord } from "./request-data";

export type ExaminationRequest = RequestRecord & { accession: string };
export type TranscriptLine = { id: string; time: number; text: string };
export type ExaminationPart = { id: string; title: string; lines: TranscriptLine[] };

export function examinationRequests(): ExaminationRequest[] {
  return initialRequests().slice(0, 8).map(record => ({ ...record, accession: record.review === "พร้อมใช้งาน" ? `PA69-${record.id.split("-").at(-1)}` : "" }));
}

export function blankParts(): ExaminationPart[] {
  return [
    { id: "A", title: "ประวัติและอาการสำคัญ", lines: [] },
    { id: "B", title: "การตรวจร่างกาย", lines: [] },
    { id: "C", title: "ผลการตรวจทางห้องปฏิบัติการ", lines: [] },
    { id: "D", title: "การวินิจฉัยและแผนการรักษา", lines: [] },
    { id: "E", title: "สรุปและคำแนะนำ", lines: [] },
  ];
}

export function formatDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function shortTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function recordingBlockReason(request: ExaminationRequest): string | null {
  if (request.ocr === "ไม่สามารถสแกนได้") return "สแกนคำร้องไม่สำเร็จ ต้องแก้ไขและยืนยันข้อมูลก่อน";
  if (request.ocr !== "สแกนแล้ว") return "รอผล OCR และยืนยันข้อมูลคำร้องก่อน";
  if (request.review === "ต้องแก้ไข") return "ต้องแก้ไขและยืนยันข้อมูลคำร้องก่อน";
  if (request.review !== "พร้อมใช้งาน") return "ต้องยืนยันข้อมูลคำร้องก่อน";
  if (!request.accession) return "ยังไม่มีเลขการตรวจ";
  return null;
}

export function readyForRecording(request: ExaminationRequest) {
  return recordingBlockReason(request) === null;
}
