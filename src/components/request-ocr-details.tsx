"use client";
import { useState } from 'react';
import { ocrPageText, pathologyFields, examinationOptions, additionalOptions, operationOptions, precautionOptions, requirementOptions, type OcrResult, type PathologyFields } from '@/lib/ocr-result';

const choiceGroups = [
  ['tests', 'ส่งตรวจ', examinationOptions], ['additionalTests', 'ย้อมเพิ่มเติม', additionalOptions],
  ['operations', 'Operation', operationOptions], ['requirements', 'ระบุความต้องการเพิ่มเติม', requirementOptions],
  ['precautions', 'Infectious precaution', precautionOptions],
] as const;
const multiline = new Set(['clinicalHistory', 'radiographicFindings', 'clinicalDiagnosis', 'specimen']);
export default function RequestOcrDetails({ result, fields, onChange }: { result?: OcrResult; fields: PathologyFields; onChange?: (value: PathologyFields) => void }) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = result?.pages[pageIndex] ?? result?.pages[0];
  return <section className="request-form-details" aria-label="ข้อมูลใบส่งตรวจ">
    <div className="request-choice-groups">{choiceGroups.map(([key, label, options]) => <fieldset key={key}><legend>{label}</legend>{onChange ? <div className="request-choice-options">{options.map(option => <label key={option}><input type="checkbox" checked={fields[key]?.includes(option) ?? false} onChange={event => {
      let values = fields[key] ?? [];
      if (event.target.checked) values = key === 'precautions' && option === 'None' ? ['None'] : [...values.filter(v => key !== 'precautions' || v !== 'None'), option];
      else values = values.filter(v => v !== option);
      onChange({ ...fields, [key]: values });
    }}/>{option}</label>)}</div> : <p>{fields[key]?.join(' · ') || '—'}</p>}</fieldset>)}</div>
    <h3 className="text-base font-semibold">ข้อมูลสิ่งส่งตรวจ</h3>
    {onChange ? <div className="request-field-grid">{pathologyFields.map(([key, label]) => <label key={key} className={`intake-edit-label ${multiline.has(key) ? 'request-field-wide' : ''}`}>{label}{multiline.has(key) ? <textarea rows={3} className="intake-select" value={fields[key] ?? ''} onChange={event => onChange({ ...fields, [key]: event.target.value })}/> : <input className="intake-select" value={fields[key] ?? ''} onChange={event => onChange({ ...fields, [key]: event.target.value })}/>}</label>)}</div>
      : <dl className="request-field-grid">{pathologyFields.map(([key, label]) => <div key={key} className={multiline.has(key) ? 'request-field-wide' : ''}><dt>{label}</dt><dd>{fields[key] || '—'}</dd></div>)}</dl>}
    {page && <details className="request-raw-ocr"><summary>ผล OCR ต้นฉบับ</summary>
      {result && result.pages.length > 1 && <label className="intake-edit-label mt-4">หน้าเอกสาร<select className="intake-select" value={pageIndex} onChange={event => setPageIndex(Number(event.target.value))}>{result.pages.map((item, i) => <option value={i} key={i}>หน้า {item.page}</option>)}</select></label>}
      <dl className="request-field-grid"><div><dt>คุณภาพภาพ (คะแนน 0–100)</dt><dd>{page.image_quality.score}</dd></div><div><dt>ความมั่นใจ OCR</dt><dd>{page.confidence === null ? 'API ไม่ระบุ' : page.confidence}</dd></div><div><dt>การแจ้งเตือนจาก OCR</dt><dd>{page.needs_review ? 'ต้องตรวจสอบ' : 'ไม่มีการแจ้งเตือน'}</dd></div><div><dt>เวลาประมวลผล</dt><dd>{page.seconds} วินาที</dd></div></dl>
      {page.reasons.length > 0 && <ul className="mb-4 space-y-1 text-xs text-amber-700">{page.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
      <pre>{ocrPageText(page)}</pre>
      {page.tables.length > 0 && <div className="mt-4 space-y-3">{page.tables.map((table, i) => <div className="overflow-x-auto" key={i}><table aria-label={`ตาราง OCR ${i + 1}`} className="w-full border-collapse text-xs"><tbody>{table.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-[#e1e9f4] p-2">{cell}</td>)}</tr>)}</tbody></table></div>)}</div>}
    </details>}
  </section>;
}
