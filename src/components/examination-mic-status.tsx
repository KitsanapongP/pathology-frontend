export type ExaminationMicPhase = "off" | "starting" | "listening" | "processing";

export default function ExaminationMicStatus({ phase }: { phase: ExaminationMicPhase }) {
  const label = { off: "ไมค์ปิด", starting: "กำลังเปิดไมค์", listening: "กำลังรับเสียง", processing: "กำลังประมวลผล" }[phase];
  return <div className="station-mic-state" data-phase={phase} data-pedal-ignore role="status" aria-live="polite" aria-atomic="true">
    <span className="station-mic-lamp" aria-hidden="true" />
    <span className="station-mic-label">{label}</span>
  </div>;
}
