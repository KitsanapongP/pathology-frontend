import { initialRequests, type RequestRecord } from "./request-data";

export type ExaminationRequest = RequestRecord & { accession: string };
export type TranscriptLine = { id: string; time: number; text: string };
export type ExaminationPart = { id: string; title: string; lines: TranscriptLine[] };

export function examinationRequests(): ExaminationRequest[] {
  return initialRequests().slice(0, 8).map(record => ({ ...record, accession: record.review === "พร้อมใช้งาน" ? `PA69-${record.id.split("-").at(-1)}` : "" }));
}

export function blankParts(): ExaminationPart[] {
  return [
    { id: "A", title: "Part A", lines: [] },
    { id: "B", title: "Part B", lines: [] },
    { id: "C", title: "Part C", lines: [] },
    { id: "D", title: "Part D", lines: [] },
    { id: "E", title: "Part E", lines: [] },
  ];
}

export function visibleExaminationParts(parts: ExaminationPart[], audioPartIds: readonly string[], enabledPartIds: readonly string[]) {
  return parts.filter((part, index) => index === 0 || part.lines.length > 0 || audioPartIds.includes(part.id) || enabledPartIds.includes(part.id));
}

export function populatedExaminationParts(parts: ExaminationPart[], audioPartIds: readonly string[]) {
  return parts.filter(part => part.lines.length > 0 || audioPartIds.includes(part.id));
}

export function unlockedExaminationParts(parts: ExaminationPart[], completedPartIds: readonly string[], confirmed = false) {
  const ids = parts.length ? [parts[0].id] : [];
  if (confirmed) return ids;
  for (let index = 0; index < parts.length - 1 && completedPartIds.includes(parts[index].id); index += 1) ids.push(parts[index + 1].id);
  return ids;
}

export function mayCompleteExaminationPart(parts: ExaminationPart[], audioPartIds: readonly string[], completedPartIds: readonly string[], id: string) {
  const populated = populatedExaminationParts(parts, audioPartIds);
  const index = parts.findIndex(part => part.id === id);
  return index >= 0 && populated.some(part => part.id === id) && !completedPartIds.includes(id)
    && parts.slice(0, index).every(part => !populated.includes(part) || completedPartIds.includes(part.id));
}

export function completedPartsAfterEdit(parts: ExaminationPart[], next: ExaminationPart[], completedPartIds: readonly string[]) {
  return completedPartIds.filter(id => JSON.stringify(parts.find(part => part.id === id)?.lines) === JSON.stringify(next.find(part => part.id === id)?.lines));
}

export function maySubmitExamination(parts: ExaminationPart[], audioPartIds: readonly string[], completedPartIds: readonly string[]) {
  const populated = populatedExaminationParts(parts, audioPartIds);
  return populated.length > 0 && populated.every(part => completedPartIds.includes(part.id));
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
