import { mockPatientName } from './mock-patient';
import type { OcrResult, PathologyFields } from './ocr-result';

// Authored from scratch: no source names, identifiers, dates or clinical text.
// fieldDraft is a proposed extraction result; it is NOT returned by the OCR envelope.
export function ocrExample(index: number): { result: OcrResult; fieldDraft: PathologyFields; patientName: string; hn: string } {
  const patientName = mockPatientName(index);
  const hn = `HN-TEST-${String(index + 1).padStart(4, '0')}`;
  const accessionNumber = `${index === 0 ? 'CB' : 'S'}69-TEST-${String(index + 1).padStart(4, '0')}`;
  const fieldDraft: PathologyFields = {
    accessionNumber, an: index === 0 ? 'AN-TEST-0001' : '', age: index === 3 ? '' : `${[42, 35, 58][index]} ปี`,
    sex: index % 2 === 0 ? 'หญิง' : 'ชาย', hospital: 'โรงพยาบาลสมมติ', ward: index === 0 ? 'หน่วยตรวจสมมติ A' : '',
    requestingDoctor: 'พญ. อรุณี แพทย์สมมติ', specimen: index === 0 ? 'ตัวอย่างเซลล์ A' : 'ตัวอย่างชิ้นเนื้อ A',
    specimenSite: index === 3 ? '' : 'ตำแหน่งตัวอย่าง A', procedure: '', collectedAt: '',
    clinicalHistory: 'ข้อมูลสมมติสำหรับทดสอบแบบฟอร์ม', clinicalDiagnosis: '',
  };
  const text = `ใบส่งตรวจ / Pathological examination request\nเลขที่: ${accessionNumber}\nชื่อ-สกุล / Patient: ${patientName}\nHN: ${hn}\nAN: ${fieldDraft.an}\nอายุ: ${fieldDraft.age}\nเพศ: ${fieldDraft.sex}\nโรงพยาบาล: ${fieldDraft.hospital}\nWard: ${fieldDraft.ward}\nแพทย์ผู้ส่ง: ${fieldDraft.requestingDoctor}\nSpecimen: ${fieldDraft.specimen}\nClinical history: ${fieldDraft.clinicalHistory}\nClinical Diagnosis: \nOperation: `;
  const tables = index === 0 ? [[['ชื่อ-สกุล', patientName, 'HN', hn], ['อายุ', fieldDraft.age!, 'เพศ', fieldDraft.sex!]]] : index === 2 ? [[['Specimen', fieldDraft.specimen!]]] : [];
  return { patientName, hn, fieldDraft, result: {
    kaoocr_version: 'contract-example-v1', generated_at: '2026-10-24T09:00:00+07:00', file: `ocr-example-${index + 1}.pdf`,
    profile: 'document', speed: 'standard', total_seconds: 8 + index, text,
    pages: [{ page: 1, engine: 'ocr', engine_label: 'OCR', confidence: null, needs_review: false, reasons: [],
      handwriting: { segments: index === 0 ? 2 : 0 },
      image_quality: { score: [95, 89, 85, 78][index], verdict: '', metrics: { Sharpness: 85, Contrast: 90, Lighting: 88, Resolution: 95 }, enhancements: [] },
      seconds: 8 + index, text: index === 0 || index === 2 ? `<p>${text}</p>` : text, plain_text: text, tables,
    }],
  } };
}
