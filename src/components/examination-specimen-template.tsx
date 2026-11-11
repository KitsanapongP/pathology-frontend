import { Fragment, type ReactNode } from "react";

function Choices({ id, options }: { id: string; options: readonly string[] }) {
  return <span className="station-template-choices" role="group" aria-label="ตัวเลือก">{options.map((option, index) => <Fragment key={option}>{index > 0 && <span className="station-template-separator" aria-hidden="true"> / </span>}<span className="station-template-choice" data-template-choice={`${id}:${option}`}>{option}</span></Fragment>)}</span>;
}

function Blank({ label }: { label: string }) {
  return <span className="station-template-blank" aria-label={label}>……</span>;
}

function TemplateSection({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return <section className="station-template-section" data-template-section={id} aria-labelledby={`template-${id}`}>
    <h3 id={`template-${id}`}><span className="station-template-step">{number}</span>{title}</h3>
    <div className="station-template-section-content">{children}</div>
  </section>;
}

export default function ExaminationSpecimenTemplate() {
  return <aside className="station-specimen-template" aria-labelledby="station-template-title">
    <header><h2 id="station-template-title">Biopsy</h2><p className="station-template-number">Surgical number <span>S<Blank label="เลข Surgical number" /></span></p></header>
    <div className="station-template-body">
      <TemplateSection id="containers" number="01" title="จำนวนภาชนะ">
        <p><Blank label="จำนวนภาชนะ" /> containers are received.</p>
      </TemplateSection>
      <TemplateSection id="receipt" number="02" title="การรับและจำนวนชิ้น">
        <p>Received in formalin <Choices id="verb" options={["is", "are"]} /></p>
        <p><Choices id="quantity" options={["a", "an", "two", "three", "four", "multiple"]} /> <Choices id="pieces" options={["pieces of"]} /></p>
      </TemplateSection>
      <TemplateSection id="appearance" number="03" title="ลักษณะชิ้นเนื้อ">
        <dl className="station-template-properties">
          <div><dt>ความแน่น</dt><dd><Choices id="consistency" options={["soft", "firm", "hard"]} /></dd></div>
          <div><dt>สี</dt><dd><Choices id="color" options={["dark brown", "gray", "tan", "yellow", "white", "green"]} /></dd></div>
          <div><dt>รูปทรง</dt><dd><Choices id="shape" options={["longitudinal"]} /> <Blank label="รายละเอียดรูปทรง" /></dd></div>
          <div><dt>ลักษณะ</dt><dd><Choices id="material" options={["tissue", "mass"]} /></dd></div>
          <div><dt>สิ่งร่วม</dt><dd><Choices id="accompanying" options={["with blood clot", "with mucous"]} /></dd></div>
        </dl>
      </TemplateSection>
      <TemplateSection id="measurements" number="04" title="ขนาด">
        <p>measuring <Blank label="ขนาดที่หนึ่ง" /> × <Blank label="ขนาดที่สอง" /> × <Blank label="ขนาดที่สาม" /> cm.</p>
        <p><Choices id="aggregate" options={["in aggregate"]} /> <Blank label="ขนาดรวม" /> cm. in <Choices id="dimension" options={["diameter", "each"]} /></p>
        <p><Blank label="ความยาว" /> cm. in length and <Blank label="เส้นผ่านศูนย์กลาง" /> cm. in diameter. (each)</p>
      </TemplateSection>
      <TemplateSection id="sections" number="05" title="ส่วนที่ส่งตรวจ">
        <p><Choices id="sampling" options={["All", "Representative section"]} /> <Choices id="plural" options={["s"]} /> <Choices id="section-verb" options={["is", "are"]} /></p>
      </TemplateSection>
      <TemplateSection id="submission" number="06" title="การตัดแบ่งและส่งตรวจ">
        <p><Choices id="bisection" options={["It is bisected and all", "They are bisected and all"]} /> submitted <Choices id="decalcification" options={["and decalcified"]} /> as <Blank label="รายละเอียดการส่งตรวจ" /></p>
      </TemplateSection>
    </div>
  </aside>;
}
