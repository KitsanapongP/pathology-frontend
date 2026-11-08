"use client";

import { pedalBindings, type Pedal, type PedalContext, type PedalPresentation } from "@/lib/examination-controls";
import ExaminationPedalButton from "./examination-pedal-button";
import PortalIcon from "./portal-icon";
import ExaminationFootKey from "./examination-foot-key";

type Props = {
  open: boolean; onToggle: () => void; context: PedalContext; primaryAction: string; presentation?: PedalPresentation;
  pressed: Pedal | null; onPress: (pedal: Pedal) => void; onRelease: (pedal: Pedal, cancelled?: boolean) => void;
  command: string; onCommandChange: (value: string) => void; onCommand: () => void;
  speechSupported: boolean | undefined; speechText: string; busy: boolean;
};

export default function ExaminationDevTools(props: Props) {

  const contexts: Record<PedalContext, string> = { standby: "ค้นหาคำร้อง", case: "ตรวจสอบเคส", record: "บันทึกผล", review: "ตรวจสอบผล", complete: "เสร็จสิ้น", help: "คู่มือ", confirm: "ยืนยันผล", results: "เลือกคำร้อง", parts: "เปลี่ยน Part", voice: "โหมดเสียง", tools: "เครื่องมือ", lines: "เลือกบรรทัด", entry: "เพิ่มข้อความ", edit: "แก้ข้อความ", playback: "ฟังเสียง" };
  return <div data-pedal-ignore className="station-dev-tools">
    {props.open && <section id="station-dev-panel" className="station-dev-panel" aria-label="ทดสอบแป้นเหยียบ">
      <div className="station-dev-heading"><h2>แป้นเหยียบจำลอง</h2><span>{contexts[props.context]}</span><button aria-label="ปิดแป้นเหยียบจำลอง" onClick={props.onToggle}><PortalIcon name="close" /></button></div>
      <div className="station-dev-pedals">{(["left", "center", "right"] as Pedal[]).map(pedal => <ExaminationPedalButton key={pedal} pedal={pedal} pressed={props.pressed} onPress={props.onPress} onRelease={props.onRelease} className={`${pedal} ${props.pressed === pedal ? "pressed" : ""}`} aria-label={`จำลองแป้น${pedalBindings[pedal].position}`}>
        <ExaminationFootKey pedal={pedal} /><kbd>{pedalBindings[pedal].keyboard}</kbd>
      </ExaminationPedalButton>)}</div>
      <details className="station-dev-details"><summary>ทดสอบคำสั่งเสียง</summary>
      <div className="station-dev-speech">
        <span>STT ชั่วคราว · th-TH</span>
        <output aria-live="polite">{props.speechText || (props.speechSupported === false ? "เบราว์เซอร์นี้ไม่รองรับ ลองเปิดใน Chrome หรือใช้ช่องคำสั่ง" : "ผลทดสอบเสียงจะแสดงที่นี่")}</output>
        <p>เสียงอาจส่งไปบริการของเบราว์เซอร์ ใช้ข้อมูลทดสอบ</p>
      </div>
      <form onSubmit={event => { event.preventDefault(); props.onCommand(); }} className="station-dev-command"><input aria-label="คำสั่งทดสอบ" value={props.command} onChange={event => props.onCommandChange(event.target.value)} placeholder="พิมพ์คำสั่งทดสอบ" /><button disabled={props.busy || !props.command.trim()} aria-label="ส่งคำสั่งทดสอบ"><PortalIcon name="arrow" /></button></form>
      </details>
    </section>}
    <button className="station-dev-toggle" aria-label={props.open ? "ปิดเครื่องมือทดสอบแป้นเหยียบ" : "เปิดเครื่องมือทดสอบแป้นเหยียบ"} aria-expanded={props.open} aria-controls={props.open ? "station-dev-panel" : undefined} onClick={props.onToggle}><PortalIcon name={props.open ? "close" : "workflow"} /></button>
  </div>;
}
