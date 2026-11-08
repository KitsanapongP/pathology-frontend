import PortalIcon from "./portal-icon";

export default function ExaminationStepper({ step, onBack }: { step: number; onBack: (step: number) => void }) {
  return <section className="exam-step-header intake-panel" aria-label="ขั้นตอนบันทึกผลการตรวจ">
    <h1 className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>บันทึกผลการตรวจ</h1>
    <ol className="exam-stepper">{["เลือกเอกสาร", "บันทึกผล", "ตรวจสอบและยืนยัน"].map((title, index) => {
      const number = index + 1;
      return <li key={title} className={`${number === step ? "active" : ""} ${number < step ? "complete" : ""}`} aria-current={number === step ? "step" : undefined}><button type="button" disabled={number >= step} onClick={() => onBack(number)}><span className="exam-step-number">{number < step ? <PortalIcon name="check" /> : number}</span><span>{title}</span></button>{number < 3 && <span className="exam-step-line" />}</li>;
    })}</ol>
  </section>;
}
