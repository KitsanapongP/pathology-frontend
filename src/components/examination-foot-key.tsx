import type { Pedal } from "@/lib/examination-controls";

export default function ExaminationFootKey({ pedal = "center" }: { pedal?: Pedal }) {
  const position = pedal === "left" ? "ซ้าย" : pedal === "right" ? "ขวา" : "กลาง";
  return <span className="station-foot-key" role="img" aria-label={`แป้น${position}`}>
    <svg viewBox="0 0 72 30" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="70" height="28" rx="7" fill="#e7ede9" stroke="#bdccc3" />
      {(["left", "center", "right"] as Pedal[]).map((position, index) => <rect key={position} x={7 + index * 22} y="6" width="14" height="18" rx="3" fill={position === pedal ? "currentColor" : "#bdccc3"} />)}
    </svg>
  </span>;
}
