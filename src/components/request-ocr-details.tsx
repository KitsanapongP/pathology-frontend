"use client";
import { PortalText, usePortalLanguage } from './portal-preferences';
import { useState } from 'react';
import { ocrPageText, pathologyFields, examinationOptions, additionalOptions, operationOptions, precautionOptions, requirementOptions, type OcrResult, type PathologyFields } from '@/lib/ocr-result';

const choiceGroups = [
  ['tests', 'ส่งตรวจ', examinationOptions], ['additionalTests', 'ย้อมเพิ่มเติม', additionalOptions],
  ['operations', 'Operation', operationOptions], ['requirements', 'ระบุความต้องการเพิ่มเติม', requirementOptions],
  ['precautions', 'Infectious precaution', precautionOptions],
] as const;
const multiline = new Set(['clinicalHistory', 'referralNote', 'radiographicFindings', 'clinicalDiagnosis', 'specimen']);
export default function RequestOcrDetails({ result, fields, onChange }: { result?: OcrResult; fields: PathologyFields; onChange?: (value: PathologyFields) => void }) {
  const { t } = usePortalLanguage();
  const [pageIndex, setPageIndex] = useState(0);
  const page = result?.pages[pageIndex] ?? result?.pages[0];
  return <section className="request-form-details" aria-label={t("ข้อมูลใบส่งตรวจ")}>
    <div className="request-choice-groups">{choiceGroups.map(([key, label, options]) => <fieldset key={key}><legend><PortalText>{label}</PortalText></legend>{onChange ? <div className="request-choice-options">{options.map(option => <label key={option}><input type="checkbox" checked={fields[key]?.includes(option) ?? false} onChange={event => {
      let values = fields[key] ?? [];
      if (event.target.checked) values = key === 'precautions' && option === 'None' ? ['None'] : [...values.filter(v => key !== 'precautions' || v !== 'None'), option];
      else values = values.filter(v => v !== option);
      onChange({ ...fields, [key]: values });
    }}/><PortalText>{option}</PortalText></label>)}</div> : <p><PortalText>{fields[key]?.join(' · ') || '—'}</PortalText></p>}</fieldset>)}</div>
    <h3 className="text-base font-semibold"><PortalText>ข้อมูลสิ่งส่งตรวจ</PortalText></h3>
    {onChange ? <div className="request-field-grid">{pathologyFields.map(([key, label]) => <label key={key} className={`intake-edit-label ${multiline.has(key) ? 'request-field-wide' : ''}`}><PortalText>{label}</PortalText>{multiline.has(key) ? <textarea rows={3} className="intake-select" value={fields[key] ?? ''} onChange={event => onChange({ ...fields, [key]: event.target.value })}/> : <input className="intake-select" value={fields[key] ?? ''} onChange={event => onChange({ ...fields, [key]: event.target.value })}/>}</label>)}</div>
      : <dl className="request-field-grid">{pathologyFields.map(([key, label]) => <div key={key} className={multiline.has(key) ? 'request-field-wide' : ''}><dt><PortalText>{label}</PortalText></dt><dd>{fields[key] || '—'}</dd></div>)}</dl>}
    {page && <details className="request-raw-ocr"><summary><PortalText>ผล OCR ต้นฉบับ</PortalText></summary>
      {result && result.pages.length > 1 && <label className="intake-edit-label mt-4"><PortalText>หน้าเอกสาร</PortalText><select className="intake-select" value={pageIndex} onChange={event => setPageIndex(Number(event.target.value))}>{result.pages.map((item, i) => <option value={i} key={i}><PortalText>หน้า </PortalText><PortalText>{item.page}</PortalText></option>)}</select></label>}
      <dl className="request-field-grid"><div><dt><PortalText>คุณภาพภาพ (คะแนน 0–100)</PortalText></dt><dd><PortalText>{page.image_quality.score}</PortalText></dd></div><div><dt><PortalText>ความมั่นใจ OCR</PortalText></dt><dd><PortalText>{page.confidence === null ? 'API ไม่ระบุ' : page.confidence}</PortalText></dd></div><div><dt><PortalText>การแจ้งเตือนจาก OCR</PortalText></dt><dd><PortalText>{page.needs_review ? 'ต้องตรวจสอบ' : 'ไม่มีการแจ้งเตือน'}</PortalText></dd></div><div><dt><PortalText>เวลาประมวลผล</PortalText></dt><dd><PortalText>{page.seconds}</PortalText><PortalText> วินาที</PortalText></dd></div></dl>
      {page.reasons.length > 0 && <ul className="mb-4 space-y-1 text-xs text-amber-700">{page.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
      <pre>{ocrPageText(page)}</pre>
      {page.tables.length > 0 && <div className="mt-4 space-y-3">{page.tables.map((table, i) => <div className="overflow-x-auto" key={i}><table aria-label={t(`ตาราง OCR ${i + 1}`)} className="w-full border-collapse text-xs"><tbody>{table.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-[#e1e9f4] p-2">{cell}</td>)}</tr>)}</tbody></table></div>)}</div>}
    </details>}
  </section>;
}
