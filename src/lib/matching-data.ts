import { initialRequests } from "./request-data";

export type MatchStatus = "matched" | "unreadable" | "unmatched" | "duplicate";
export type MatchItem = {
  id: string;
  qr: string;
  requestId: string;
  position: string;
  kind: "slide" | "cassette";
  confidence: number | null;
  confirmed: boolean;
  bounds: { x: number; y: number; width: number; height: number };
};
export type MatchingState = { items: MatchItem[]; image: string; imageWidth: number; imageHeight: number; trayId: string; lastScanned: string };

export const matchingRequests = initialRequests();

export function initialMatchingState(): MatchingState {
  const requestNumbers = [18, 21, 22, 31, 35, 36, 37, 39];
  const unreadable = ["B3", "C5", "D7"];
  const unmatched = ["B6", "D3"];
  const items: MatchItem[] = Array.from({ length: 32 }, (_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    const position = `${"ABCD"[row]}${column + 1}`;
    return {
      id: position, position, kind: "slide", confirmed: false,
      qr: unreadable.includes(position) ? "" : `SLDC${String(1234 + index).padStart(6, "0")}`,
      requestId: unreadable.includes(position) || unmatched.includes(position) ? "" : `REQ-2569-${String(requestNumbers[index % 8]).padStart(4, "0")}`,
      confidence: unreadable.includes(position) ? null : 90 + index % 10,
      bounds: { x: .025 + column * .122, y: .022 + row * .246, width: .105, height: .219 },
    };
  });
  // Keep the first row and first problem slots visible in the initial table page.
  const priority = [..."12345678"].map(value => `A${value}`).concat(["B3", "B6"]);
  items.sort((a, b) => {
    const left = priority.indexOf(a.id); const right = priority.indexOf(b.id);
    return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
  });
  return { items, image: "/images/slide-tray.png", imageWidth: 1586, imageHeight: 992, trayId: "TRAY-03", lastScanned: "2026-10-16T14:32:18+07:00" };
}

export function matchStatus(item: MatchItem, items: MatchItem[]): MatchStatus {
  if (!item.qr.trim()) return "unreadable";
  if (items.some(other => other.id !== item.id && other.qr.trim() === item.qr.trim())) return "duplicate";
  if (!item.requestId || !matchingRequests.some(request => request.id === item.requestId)) return "unmatched";
  return "matched";
}

export const matchLabels: Record<MatchStatus, string> = { matched: "จับคู่แล้ว", unreadable: "อ่าน QR ไม่ได้", unmatched: "ไม่พบคำร้อง", duplicate: "รหัสซ้ำ" };

export function validMatchingDraft(value: unknown): value is MatchingState {
  if (!value || typeof value !== "object") return false;
  const state = value as MatchingState;
  return Array.isArray(state.items) && state.items.length <= 500 && typeof state.image === "string" && (state.image === "/images/slide-tray.png" || state.image.startsWith("data:image/png;base64,")) && Number.isFinite(state.imageWidth) && state.imageWidth > 0 && Number.isFinite(state.imageHeight) && state.imageHeight > 0 && typeof state.trayId === "string" && Number.isFinite(Date.parse(state.lastScanned)) && new Set(state.items.map(item => item.id)).size === state.items.length && state.items.every(item => typeof item.id === "string" && typeof item.qr === "string" && typeof item.requestId === "string" && typeof item.position === "string" && ["slide", "cassette"].includes(item.kind) && typeof item.confirmed === "boolean" && (item.confidence === null || (Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 100)) && item.bounds && [item.bounds.x, item.bounds.y, item.bounds.width, item.bounds.height].every(number => Number.isFinite(number) && number >= 0 && number <= 1)) && state.items.every(item => !item.confirmed || matchStatus(item, state.items) === "matched");
}
