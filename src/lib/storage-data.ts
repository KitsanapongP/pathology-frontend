export type StoredItem = {
  id: string; kind: "tissue" | "slides"; category: string; storedAt: string;
  patientName: string; location: string; status: string; trays: number; slides: number; recorder: string;
  borrowedBy: string; borrowedAt: string; returnedAt: string;
};

// Local fixtures; storage and loan APIs will replace this directory.
export function storageItems(kind: StoredItem["kind"]): StoredItem[] {
  return Array.from({ length: kind === "tissue" ? 52 : 18 }, (_, i) => ({
    id: `${kind === "tissue" ? "CNT" : "BOX"}-2569-${String((kind === "tissue" ? 42 : 12) + i).padStart(4, "0")}`,
    patientName: kind === "tissue" ? ["สมชาย ใจดี", "วิภา สุขใจ", "มานะ พัฒนากุล"][i % 3] : "",
    kind, category: kind === "slides" ? "สไลด์และคาสเซ็ต" : i % 3 === 2 ? "เซลล์วิทยา" : "ชิ้นเนื้อ",
    storedAt: `2026-10-${String(16 - i % 15).padStart(2, "0")}T14:32:00+07:00`,
    location: kind === "tissue" ? `ตู้ ${["A1", "B2", "C1"][i % 3]} / ชั้น ${i % 3 + 1} / กล่อง ${String(i % 6 + 1).padStart(2, "0")} / ช่อง 05` : `ชั้น ${i % 4 + 1} ตึก REC ห้องเก็บสไลด์ A`,
    status: kind === "tissue" ? "จัดเก็บแล้ว" : "ครบถ้วน",
    trays: [4, 6, 3, 5, 8, 4][i % 6], slides: [96, 144, 72, 120, 192, 80][i % 6],
    recorder: "ผู้ใช้งาน", borrowedBy: i % 3 !== 2 ? "นพ. กิตติพงศ์" : "",
    borrowedAt: i % 3 !== 2 ? "2026-10-16T10:15:00+07:00" : "", returnedAt: i % 3 === 1 ? "2026-10-16T11:20:00+07:00" : "",
  }));
}

export function storageDate(value: string) {
  return value ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—";
}
