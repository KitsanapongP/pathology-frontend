# University OCR: field mapping and frontend examples

Reviewed locally: four JSON responses and one HTML companion. This report retains schema/label observations only. Original documents and personal or clinical values were not copied into this repository.

## Observed response

All four JSONs have the same envelope: `kaoocr_version`, `generated_at`, `file`, `profile`, `speed`, `total_seconds`, `pages`, `text`.
Each page has `page`, `engine`, `engine_label`, `confidence`, `needs_review`, `reasons`, `handwriting.segments`, `image_quality`, `seconds`, `text`, `plain_text`, `tables`.

| Example | Pages | Tables | Confidence | OCR review flag |
| --- | --- | --- | --- | --- |
| A | 1 | 6 | null | false |
| B | 1 | 0 | null | false |
| C | 1 | 1 | null | false |
| D | 1 | 0 | null | false |

Some `text` contains HTML; `plain_text` is available in all examples. Root and page text differ in three examples. Tables are arrays of rows, with inconsistent column counts in some tables. Do not assume a fixed table schema or that zero tables means failed OCR. The HTML companion is a presentation of OCR output, not a typed clinical payload or source document scan.

## Field mapping

These are labels found in OCR text, not JSON property names. Exact label presence varies by document.

| Document label / concept | Frontend field | Assessment |
| --- | --- | --- |
| ชื่อ-สกุล / Patient | `patientName` | Existing field; currently requires structured extraction or human entry |
| HN and OCR variants | `hn` | Existing field; must separately look up patient in hospital/tenant scope |
| เลขที่ / specimen accession identifier | `pathology.accessionNumber` | Added separately from internal `REQ-*` request ID; requires semantic confirmation |
| AN | `pathology.an` | Added; must not be substituted for HN |
| อายุ / เพศ | `pathology.age`, `pathology.sex` | Added as text drafts; preserve unknown/illegible values as empty |
| โรงพยาบาล | `pathology.hospital` | Added; extraction source is not automatically the active tenant |
| หอผู้ป่วย / Ward | `pathology.ward` | Added |
| แพทย์ / ผู้ส่ง | `pathology.requestingDoctor` | Added; distinct from uploader/account identity and existing list sender |
| สิ่งส่งตรวจ / Specimen | `pathology.specimen` | Added |
| ตำแหน่ง | `pathology.specimenSite` | Added; distinct from inventory location |
| Operation | `pathology.procedure` | Added |
| วันที่ / Date | `pathology.collectedAt` | Draft only: ambiguous dates must not be assumed to mean collection date |
| ประวัติ / Clinical history | `pathology.clinicalHistory` | Added; extraction suggestion requires human review |
| Clinical Diagnosis | `pathology.clinicalDiagnosis` | Added; distinct from a final examination report |
| `image_quality.score` | OCR image quality display | Not OCR accuracy or clinical confidence |
| `confidence` | OCR confidence display | null displays API ไม่ระบุ; numeric scale needs API agreement |
| `needs_review`, `reasons` | OCR notices | Never auto-converts into user-confirmed พร้อมใช้งาน |
| `generated_at`, `file` | Processing metadata | Not authoritative upload time, request ID or accession number |

The existing general-purpose categories (คำร้องทั่วไป / ขอใช้บริการ / ส่งตรวจ) are not provided by this OCR payload. The four authored examples use ส่งตรวจ; do not classify documents from filename prefixes alone. Pathology subtype/template choices should be a separately agreed directory.

## Implementation in this branch

- `src/lib/ocr-result.ts`: observed envelope types, proposed normalized draft fields, page text helper.
- `src/lib/ocr-examples.ts`: four entirely synthetic fixtures, covering HTML/plain text, tables/no tables, null confidence and absent draft values. Names, HN/AN/accessions, hospital, doctor, dates, filenames and clinical prose are authored from scratch.
- `initialRequests()` includes these four examples. Open ดู or แก้ไข for the first four requests on `/portal/requests`. Search accepts accession, HN and patient name.
- Expanded fields are editable. Original OCR content stays separate from corrected values. No original source HTML is executed; text and table cells are rendered as React text.
- Field drafts are manually authored fixtures, NOT extracted from OCR by a production parser. No API call or real OCR ingestion has been added. Edits remain in component memory until API persistence is connected.

## API handoff needed

1. Keep OCR output separate from structured extraction (e.g. an LLM/backend service); agree a normalized field payload with nullable values, per-field source page/label and extraction confidence if available. Do not mistake this proposed payload for an existing response field.
2. Agree job/request IDs and processing states (queued/processing/completed/failed). OCR response alone cannot supply application workflow state, tenant, upload timestamp, examination number allocation or user approval history.
3. Confirm confidence/quality scales and meaning of review reasons. All supplied confidence values are null, so a numeric accuracy indicator cannot be inferred.
4. Agree patient lookup/new-record API, hospital/tenant scoping and identifier namespaces. OCR suggestions must not merge or create a patient automatically.
5. Agree original page preview URL, page count and optional field bounding boxes. JSON text and companion HTML do not provide a source scan for visual comparison or field highlights.
6. User confirmation must be stored server-side, with corrected fields and the untouched OCR result available for comparison.


## Updated intake workflow (25 October 2026)

The primary screen is now a full-width request directory. Normal ingestion is scanner folder -> backend OCR/mapping -> database -> request list. Manual file selection is collapsed by default for exceptional use; template downloads and the general-purpose category column/filter are removed from this screen.

Form terminology is based on labels only in the supplied request form image. No image, handwritten values, patient identifiers or clinical notes from that image are copied into the app. All fixture values remain synthetic.

- Search: all fields or scope to accession, HN, AN, name. Multiple words are combined with AND; HN/AN/accession scopes tolerate separator differences.
- Filters: Ward / OPD, ส่งตรวจ, received-date range in Asia/Bangkok, OCR status, review status, requesting doctor, sex. Summary cards filter review state. Sorting and page size are independent controls.
- Checkboxes: ส่งตรวจ (Routine histology, Frozen section, Kidney biopsy, Cell block, Review), ย้อมเพิ่มเติม, Operation, additional requirements, Infectious precaution. `None` is exclusive with other precautions.
- Added labels: ผู้เก็บตัวอย่างสิ่งส่งตรวจ, โทร., วันที่เก็บสิ่งส่งตรวจ / เวลา, Clinical Information, Radiographic finding, Clinical diagnosis, รายละเอียดสิ่งส่งตรวจ, จำนวนสิ่งส่งตรวจรวม, วัน เวลานัดผู้ป่วยครั้งต่อไป.
- `receivedAt` is the list receipt timestamp; it is distinct from `uploadedAt`, OCR `generated_at` and specimen `collectedAt`. Legacy records fall back to `uploadedAt` only for local compatibility.
- `RequestIntake.loadRecords(signal)` is an optional normalized snapshot loader. When provided it refreshes every 30 seconds, supports manual refresh, cancels on unmount and blocks saving a draft if its source changed. It is NOT wired to a URL: the university response contract is still pending. Without it the screen uses local fixtures and does not simulate background arrivals.
- Manual document additions and review edits are still memory-only. An upload/write API is required before those operations persist in the database. The loader interface is not that write API.

### Bottom-of-document cross-check

Rechecked the trailing root `text` and last page `plain_text`. The bottom section includes Radiographic finding, Clinical diagnosis, specimen count, next appointment, additional requirements, Infectious precaution, and a final requesting-doctor/telephone line. The final phone is represented separately as `requestingDoctorPhone`; `collectorPhone` belongs to the specimen collector. Original contact details and checkbox selections are not copied into fixtures. Checked/unchecked markers are source extraction signals for the backend, not labels to infer from word presence.
