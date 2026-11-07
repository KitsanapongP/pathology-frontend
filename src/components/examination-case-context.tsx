import type { ExaminationRequest } from "@/lib/examination-data";

type ContextRow = readonly [string, string | string[] | undefined, boolean?];

function ContextSection({ title, rows, emptyText }: { title: string; rows: ContextRow[]; emptyText?: string }) {
  const populatedRows = rows.flatMap(([label, value, wide]) => {
    const text = Array.isArray(value) ? value.map(item => item.trim()).filter(Boolean).join(" · ") : value?.trim();
    return text ? [{ label, text, wide }] : [];
  });
  if (!populatedRows.length && !emptyText) return null;
  return <section className="station-context-section"><h3>{title}</h3>{populatedRows.length === 1 && populatedRows[0].label === title ? <p className="station-context-prose">{populatedRows[0].text}</p> : populatedRows.length ? <dl>{populatedRows.map(({ label, text, wide }) => <div key={label} className={wide ? "station-context-wide" : undefined}><dt>{label}</dt><dd>{text}</dd></div>)}</dl> : <p className="station-context-unavailable">{emptyText}</p>}</section>;
}

export default function ExaminationCaseContext({ request, saveStatus }: { request: ExaminationRequest; saveStatus?: "saved" | "saving" | "error" | "idle" }) {
  const fields = request.pathology ?? {};
  return <aside className="station-case-context" aria-labelledby="station-patient-name">
    <header className="station-context-identity"><h2 id="station-patient-name">{request.patientName || "ไม่ระบุชื่อผู้ป่วย"}</h2>{request.isMock && <span className="station-context-fixture">ข้อมูลสมมติ</span>}<dl className="station-context-demographics"><div><dt>HN</dt><dd>{request.hn || "ไม่ระบุ"}</dd></div><div><dt>อายุ</dt><dd>{fields.age || "ไม่ระบุ"}</dd></div><div><dt>เพศ</dt><dd>{fields.sex || "ไม่ระบุ"}</dd></div></dl></header>
    <div className="station-context-body">
      <ContextSection title="เลขอ้างอิง" rows={[["เลขคำร้อง", request.id], ["เลขการตรวจ", request.accession], ["เลขที่สิ่งส่งตรวจ", fields.accessionNumber], ["AN", fields.an]]} />
      <ContextSection title="ต้นทางและผู้ส่งตรวจ" rows={[["โรงพยาบาล", fields.hospital], ["Ward / OPD", fields.ward], ["แพทย์ผู้ส่งตรวจ", fields.requestingDoctor], ["โทร. แพทย์", fields.requestingDoctorPhone], ["ผู้ส่งคำร้อง", request.sender]]} />
      <ContextSection title="ข้อความจากแพทย์ผู้ส่งตรวจ" rows={[["ข้อความจากแพทย์ผู้ส่งตรวจ", fields.referralNote, true]]} />
      <ContextSection title="สิ่งส่งตรวจ" rows={[["รายการตรวจ", fields.tests, true], ["รายละเอียด", fields.specimen, true], ["ข้าง / ตำแหน่ง / อวัยวะ", fields.specimenSite], ["จำนวน (ถุง/ขวด)", fields.specimenCount], ["Operation", fields.operations], ["Operation อื่น ๆ", fields.procedure], ["ข้อควรระวังการติดเชื้อ", fields.precautions, true]]} />
      <ContextSection title="ข้อมูลทางคลินิก" emptyText="ไม่มีข้อมูลทางคลินิกในใบส่งตรวจ" rows={[["ประวัติและอาการ", fields.clinicalHistory, true], ["การวินิจฉัยทางคลินิก", fields.clinicalDiagnosis, true], ["ผลรังสี", fields.radiographicFindings, true], ["นัดครั้งต่อไป", fields.nextAppointment, true]]} />
      <section className="station-context-section"><h3>ผลตรวจครั้งก่อน</h3><p className="station-context-unavailable">ยังไม่ได้เชื่อมข้อมูลผลตรวจครั้งก่อน</p></section>
      <ContextSection title="การเก็บสิ่งส่งตรวจ" rows={[["ผู้เก็บ", fields.collector], ["โทร. ผู้เก็บ", fields.collectorPhone], ["วันที่เก็บ", fields.collectedAt], ["เวลาเก็บ", fields.collectedTime]]} />
      <ContextSection title="การตรวจเพิ่มเติม" rows={[["ย้อมเพิ่มเติม", fields.additionalTests], ["เลขอ้างอิง", fields.additionalNumber], ["ชื่อรายการ", fields.additionalTestName], ["ความต้องการเพิ่มเติม", fields.requirements], ["อื่น ๆ", fields.otherRequirements, true]]} />
    </div>
    {saveStatus && <footer className={`station-context-save ${saveStatus === "error" ? "is-error" : ""}`} role="status">{saveStatus === "saved" ? "เก็บในเครื่องแล้ว" : saveStatus === "saving" ? "กำลังเก็บ…" : saveStatus === "error" ? "เก็บไม่สำเร็จ" : "รอเก็บข้อมูล"}</footer>}
  </aside>;
}
