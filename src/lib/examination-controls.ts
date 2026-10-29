// Shared by the controller, pedal illustration, and in-app instruction sheet.
export type Pedal = "left" | "center" | "right";
export type ExaminationScreen = "standby" | "case" | "record" | "review" | "complete";
export type ExaminationPanel = "results" | "parts" | "voice" | "tools" | "lines" | "entry" | "edit" | "playback";
export type PedalContext = ExaminationScreen | ExaminationPanel | "help" | "confirm";
export type PedalAction = "previousControl" | "nextControl" | "activate" | "speak" | "back" | "help" | "confirm";
export type PedalBinding = { tap?: PedalAction; hold?: PedalAction; doubleTap?: PedalAction; minimumHoldMs?: number; holdDelayMs?: number };
export type PedalPresentation = { voiceLabel?: string; confirmFocused?: boolean; adjusting?: boolean; partAdjusting?: boolean };
export const pedalBindings = {
  left: { title: "ซ้าย", position: "ซ้าย", hardware: "F13", keyboard: "F8", color: "#158575" },
  center: { title: "กลาง", position: "กลาง", hardware: "F14", keyboard: "F9", color: "#5178c7" },
  right: { title: "ขวา", position: "ขวา", hardware: "F15", keyboard: "F10", color: "#a27b42" },
} as const;
export const pedalTiming = { doubleTapMs: 350, voiceHoldMs: 250, confirmHoldMs: 1500 };
export const examinationSteps = ["ระบุคำร้อง", "บันทึกผล", "ตรวจสอบและยืนยัน"];

// Controller and all instruction surfaces resolve this same per-screen map.
const navigationMap: Record<Pedal, PedalBinding> = {
  left: { tap: "previousControl", doubleTap: "back" },
  center: { tap: "activate", hold: "speak", holdDelayMs: pedalTiming.voiceHoldMs },
  right: { tap: "nextControl" },
};
export const examinationPedalMap: Record<PedalContext, Record<Pedal, PedalBinding>> = Object.fromEntries(
  (["standby", "case", "record", "review", "complete", "help", "confirm", "results", "parts", "voice", "tools", "lines", "entry", "edit", "playback"] as PedalContext[]).map(context => [context, navigationMap]),
) as Record<PedalContext, Record<Pedal, PedalBinding>>;

export function resolvePedalBinding(context: PedalContext, pedal: Pedal, confirmFocused = false, partAdjusting = false): PedalBinding {
  if (context === "confirm" && pedal === "center" && confirmFocused) return { hold: "confirm", minimumHoldMs: pedalTiming.confirmHoldMs };
  if (partAdjusting) return { tap: pedal === "left" ? "previousControl" : pedal === "right" ? "nextControl" : "activate" };
  return examinationPedalMap[context][pedal];
}

type PedalInstruction = { pedal: Pedal; action: string; steps: { gesture: string; result: string }[]; icon: "undo" | "arrow" | "microphone" | "check" };
export function examinationPedalInstructions(context: PedalContext, _primaryAction: string, presentation: PedalPresentation = {}): PedalInstruction[] {
  const voiceLabel = presentation.voiceLabel ?? (context === "standby" || context === "case" ? "พูดเลขคำร้อง" : context === "record" ? "บอกผลตรวจ" : "พูดคำสั่ง");
  const backLabel = presentation.adjusting ? "จบการปรับค่า" : context === "help" ? "ปิดคู่มือ" : context === "confirm" ? "ยกเลิกการยืนยัน" : context === "standby" ? "ล้างการค้นหา" : "กลับหน้าก่อน";
  const confirming = context === "confirm" && presentation.confirmFocused;
  return [
    { pedal: "left", action: "เลื่อนกรอบ", icon: "undo", steps: [
      { gesture: "กด 1 ครั้ง", result: presentation.adjusting ? "ลดค่า" : "เลือกรายการก่อนหน้า" },
      ...(!presentation.partAdjusting ? [{ gesture: "กด 2 ครั้งเร็ว ๆ", result: backLabel }] : []),
    ] },
    { pedal: "center", action: confirming ? "ยืนยันผลตรวจ" : "กดปุ่มที่เลือก", icon: confirming ? "check" : "microphone", steps: confirming ? [
      { gesture: `ค้าง ${pedalTiming.confirmHoldMs / 1000} วินาที`, result: "ยกเท้าเพื่อยืนยันผล" },
    ] : [
      { gesture: "กด 1 ครั้ง", result: presentation.adjusting ? "จบการปรับค่า" : "กดปุ่มในกรอบเขียว" },
      ...(!presentation.partAdjusting ? [{ gesture: "เหยียบค้าง", result: voiceLabel }, { gesture: "ยกเท้า", result: "หยุดรับเสียง" }] : []),
    ] },
    { pedal: "right", action: "เลื่อนกรอบ", icon: "arrow", steps: [
      { gesture: "กด 1 ครั้ง", result: presentation.adjusting ? "เพิ่มค่า" : "เลือกรายการถัดไป" },
    ] },
  ];
}

export function pedalForKey(key: string): Pedal | undefined {
  return (Object.keys(pedalBindings) as Pedal[]).find(pedal => {
    const binding = pedalBindings[pedal];
    return key === binding.hardware || key === binding.keyboard;
  });
}

export const voiceInstructions = [
  { label: "ค้นหาคำร้อง", example: "ศูนย์ ศูนย์ สาม แปด", stages: "1" },
  { label: "เลือกรายการ", example: "เลือกรายการที่ 1", stages: "1" },
  { label: "ไปหน้าถัดไป", example: "ไปต่อ", stages: "1–3" },
  { label: "เปลี่ยนหัวข้อ", example: "ไป Part B / หัวข้อถัดไป", stages: "2–3" },
  { label: "แก้ข้อความล่าสุด", example: "แก้ข้อความล่าสุดเป็น …", stages: "2–3" },
  { label: "แก้ไขหรือลบตามบรรทัด", example: "แก้บรรทัดที่ 2 เป็น … / ลบบรรทัดที่ 2", stages: "2–3" },
  { label: "ลบข้อความล่าสุด", example: "ลบข้อความล่าสุด", stages: "2–3" },
  { label: "ย้อนการแก้ไข", example: "ย้อนการแก้ไข / ทำซ้ำ", stages: "2–3" },
  { label: "ฟังทบทวน", example: "เล่นเสียง / หยุดเล่น / ย้อนห้าวินาที", stages: "2–3" },
  { label: "เลือกช่วงเสียง", example: "เลือกช่วงเสียงที่ 2 / ช่วงเสียงถัดไป", stages: "2–3" },
  { label: "เก็บงาน", example: "บันทึกฉบับร่าง", stages: "2–3" },
  { label: "ไปหน้ายืนยัน", example: "ยืนยันผลตรวจ", stages: "3" },
  { label: "กลับหน้าก่อน", example: "ย้อนกลับ / ยกเลิก", stages: "1–3" },
  { label: "ช่วยเหลือ", example: "ช่วยเหลือ", stages: "1–3" },
  { label: "เลื่อนหน้าจอหรือคู่มือ", example: "เลื่อนลง / เลื่อนขึ้น", stages: "1–3" },
];

export function normalizeSpokenDigits(value: string) {
  const digits: Record<string, string> = { "ศูนย์": "0", "หนึ่ง": "1", "สอง": "2", "สาม": "3", "สี่": "4", "ห้า": "5", "หก": "6", "เจ็ด": "7", "แปด": "8", "เก้า": "9" };
  return value.replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - 3664)).replace(/ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า/g, digit => digits[digit]);
}
