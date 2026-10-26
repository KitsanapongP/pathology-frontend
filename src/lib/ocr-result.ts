// The OCR envelope contains text/tables, not structured patient or clinical fields.
export type OcrResult = {
  kaoocr_version: string; generated_at: string; file: string; profile: string; speed: string;
  total_seconds: number; text: string;
  pages: {
    page: number; engine: string; engine_label: string; confidence: number | null;
    needs_review: boolean; reasons: string[]; handwriting: { segments: number };
    image_quality: { score: number; verdict: string; metrics: Record<string, number>; enhancements: string[] };
    seconds: number; text: string; plain_text: string; tables: string[][][];
  }[];
};
export const examinationOptions = ['Routine histology', 'Frozen section', 'Kidney biopsy', 'Cell block', 'Review ผลพยาธิจาก รพ. อื่น'] as const;
export const additionalOptions = ['Immunohistochemistry', 'Special stain', 'Molecular study สิ่งส่งตรวจเดิม'] as const;
export const operationOptions = ['Core biopsy', 'Incisional biopsy', 'Excision', 'Wide excision', 'Subtotal resection', 'Total resection'] as const;
export const precautionOptions = ['None', 'Contact', 'Blood born', 'Droplet', 'Airborne'] as const;
export const requirementOptions = ['Margin', 'Tumor necrosis'] as const;
export const pathologyFields = [
  ['accessionNumber', 'เลขที่สิ่งส่งตรวจ'], ['an', 'AN'], ['age', 'อายุ'], ['sex', 'เพศ'],
  ['hospital', 'โรงพยาบาลต้นทาง'], ['ward', 'Ward / OPD'], ['requestingDoctor', 'แพทย์ผู้ส่งตรวจ'],
  ['requestingDoctorPhone', 'โทร. (แพทย์ผู้ส่งตรวจ)'],
  ['collector', 'ผู้เก็บตัวอย่างสิ่งส่งตรวจ'], ['collectorPhone', 'โทร. (ผู้เก็บตัวอย่างสิ่งส่งตรวจ)'],
  ['collectedAt', 'วันที่เก็บสิ่งส่งตรวจ'], ['collectedTime', 'เวลา'],
  ['additionalNumber', 'ย้อมเพิ่มเติม · เลขที่'], ['additionalTestName', 'ชื่อรายการตรวจ'],
  ['procedure', 'Operation · อื่น ๆ (ระบุ)'], ['clinicalHistory', 'Clinical Information'],
  ['radiographicFindings', 'Radiographic finding'], ['clinicalDiagnosis', 'Clinical diagnosis'],
  ['specimen', 'รายละเอียดสิ่งส่งตรวจ'], ['specimenSite', 'ข้าง / ตำแหน่ง / อวัยวะ'],
  ['specimenCount', 'จำนวนสิ่งส่งตรวจรวม (ถุง/ขวด)'], ['nextAppointment', 'วัน เวลานัดผู้ป่วยครั้งต่อไป'],
  ['otherRequirements', 'ความต้องการเพิ่มเติม · อื่น ๆ'],
] as const;
export type PathologyFields = Partial<Record<(typeof pathologyFields)[number][0], string>> & {
  tests?: string[]; additionalTests?: string[]; operations?: string[]; precautions?: string[]; requirements?: string[];
};
// Never render OCR HTML as active markup. Root text is not interchangeable with page text.
export function ocrPageText(page: OcrResult['pages'][number]) {
  return page.plain_text.trim() || page.text.replace(/<[^>]*>/g, ' ').trim();
}
