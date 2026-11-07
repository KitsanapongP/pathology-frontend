# Examination workstation — บันทึกการตรวจ UI 2.8

วันที่ 29 ตุลาคม 2026 · `/portal/examinations`

ผลแต่ละรอบระบุขอบเขตของตัวเอง ผลตรวจเวอร์ชันก่อนหน้าไม่ใช่หลักฐานว่ารอบปัจจุบันผ่านครบ

## รอบแก้การกดรัว UI 2.8

- ขวาแตะเดี่ยว/รัวเลื่อนทันทีทุก context ไม่เปิดคู่มือ; ขณะปรับ Part ซ้าย/ขวาไม่ตีความแตะคู่ กลางจบการปรับ
- คู่มืออยู่ในเครื่องมือบน record/review และอยู่บน rail โดยตรงใน standby/case; หัวเว็บและคำสั่งเสียง “ช่วยเหลือ” ยังคงใช้ได้ ลบฮินต์ขวาสองครั้ง
- เพิ่ม controller regression กดรัวสี่ครั้งทั้งสองข้างและค้างกลางขณะปรับ Part ต้องไม่เปิดไมค์
- TypeScript, ESLint ทุกไฟล์ JS/JSX/MJS/CJS/TS/TSX ที่ Git ติดตาม และ examination tests ทั้ง 24 กรณีผ่าน; `git diff --check` ผ่าน
- ตรวจเบราว์เซอร์แบบโหลดใหม่ด้วย F8/F9/F10: กลางเข้าโหมดปรับ Part, ขวาสองครั้งเร็ว A → C, ซ้ายสองครั้งเร็ว C → A โดยยังอยู่ในโหมดปรับ, กลางค้าง 1.5 วินาทีแล้วปล่อยจบการปรับและไมค์ยังปิด รวมถึงซ้ายที่รอแตะคู่ก่อนกดกลางไม่หลุดไปทำงานหลังเข้าโหมดปรับ
- ตรวจขวารัวใน Tools/คู่มือไม่เปิด–ปิดคู่มืออัตโนมัติ; เปิดคู่มือผ่าน Tools แล้วซ้ายสองครั้งคืน target คู่มือใน Tools และปิด Tools อีกครั้งคืน target เครื่องมือบนหน้าหลัก เปิดคู่มือด้วยเท้าจาก standby/case ได้
- ตรวจภาพ record/โหมดปรับ Part ที่ 1896×1244 และ 1280×720 พร้อม simulator รวมถึง standby ที่ 1280×720; rail และปุ่มคู่มืออยู่ในจอ ไม่แก้ข้อความ/เสียงหรือยืนยันฉบับร่างเดิม ภาพหลัก: `examinations-v2-8.jpg`
- หลังสลับลำดับเฉพาะ standby ตรวจโหลดใหม่แล้ว rail เรียง “คู่มือ, ค้นหาคำร้อง” และกรอบเริ่มต้นยังเลือกค้นหาคำร้อง ภาพ: `examinations-standby-order.jpg`
- ยังไม่ได้ตรวจ hardware/STT หรือ production build ในรอบนี้

## รอบลดขั้นตอน UI 2.7

- TypeScript, ESLint ของ workflow/focus hook และ examination tests ทั้ง 23 กรณีผ่าน รวม regression ชื่อ Part เปลี่ยนแล้วกรอบเลือก/สถานะ adjustment ยังตรงกัน
- หน้าบันทึกเหลือ 4 เป้าหมายปกติ: Part ปัจจุบัน, แก้ล่าสุด, ตรวจสอบผล, เครื่องมือ; ปุ่มลองบันทึกใหม่ปรากฏเมื่อ save error เท่านั้น
- เพิ่ม behavioral hook tests สำหรับกลางเริ่ม/จบปรับ Part, ซ้าย/ขวาเปลี่ยน Part โดยไม่เปลี่ยน target, ออกจาก adjustment ก่อนนำทาง และกลับจากคู่มือโดยไม่ติดสถานะปรับเดิม รวมกรณี target ถูกนำออก
- Code review: ไมค์ไม่เริ่มระหว่างปรับ Part หรือเมื่อเลือกปุ่มบันทึก/กลับใน text dialog; คำสั่งเสียงใช้ครั้งเดียวโดยไม่เปลี่ยน scope ของ recognition ระหว่างรอผล; ยืนยันแล้วยังคงรายงานอ่านอย่างเดียวและมีเคสถัดไป
- Work settings ยังปิด Local browser use ตั้งแต่เริ่มรอบนี้ จึงไม่มีผลตรวจภาพหรือ browser interaction ใหม่สำหรับ 2.7 และไม่ใช้ผล 2.6 ด้านล่างอ้างแทน การตรวจทั้ง 1280×720 และ 1896×1244 ยังต้องทำเมื่อเปิดการควบคุมเบราว์เซอร์
- ยังไม่ได้ทดสอบไมค์/footswitch จริงหรือ production build และไม่มีการยืนยันหรือแก้ไขร่างของผู้ใช้เพื่อ QA

## รอบ workflow UX UI 2.6

- TypeScript, ESLint ของไฟล์ TS/TSX ที่แก้ และ tests 20 กรณีผ่าน รวม helper คืนเป้าหมายที่ถูกแทน/หายไป และ range step 5 วินาทีที่จำกัดต้น–ท้ายเสียง
- ตรวจในเบราว์เซอร์: ค้นหา 0038 ที่มีร่างเดิม → F9 เข้าบันทึก → F9 เปิดโหมด → F10 เลือกคำสั่ง → F9 ยืนยัน ป้าย rail เปลี่ยนเป็น “คำสั่ง” และกรอบกลับที่ปุ่มเดิม
- เปิด Part picker และเลือก B ผ่าน pointer: แสดงชื่อหัวข้อสั้นครบ A–E และกรอบกลับที่ “เปลี่ยน Part” เนื้อหาบันทึกเปลี่ยนเป็น Part B
- เข้า review และตรวจภาพ 1280×720: รายงานประกอบด้วย sections A–E ในพื้นที่เลื่อนเดียว มีข้อความเดิม Part A และสถานะว่างใน B–E; แถบคำสั่ง 5 ปุ่มยังเห็นครบ ไม่มีการแก้เนื้อหาร่างหรือยืนยันเคสจริง
- Code review แก้เส้นทางยกเลิก “แก้ล่าสุด” ให้กลับ tools, ล้าง playback error หลังเล่นสำเร็จ, reset ตำแหน่ง audio จริงพร้อมเวลาที่แสดงเมื่อเปิด playback ซ้ำ และกัน save completion จาก snapshot/เคสเก่ามาเปลี่ยนสถานะเคสปัจจุบัน
- ยังตรวจภาพ/interaction ไม่ครบ: Work settings ปิด Local browser use ระหว่างจะเปิดหน้าต่างยืนยัน จึงยังไม่ได้ตรวจหน้าต่างยืนยัน แก้ล่าสุด/ยกเลิก คู่มือซ้อน feedback/retry การฟังไฟล์จริง และขนาด 1896×1244 ในเวอร์ชันนี้
- ยังไม่ได้ทดสอบไมค์/footswitch จริง, IndexedDB failure หรือ production build รอบนี้ ผลด้านล่างเป็นการตรวจเวอร์ชันก่อนหน้า

## รอบย่อฮินต์และย้ายไฟไมค์ UI 2.5

### ตรวจร่วมกับ Portal Navigation · 2 พฤศจิกายน 2026

- ตรวจหน้า standby ที่ 1896×1244 พร้อมเปิดตัวจำลอง และ 1280×720 หลังเพิ่มหัวเว็บส่วนกลาง ขนาด 100% ยังคงใช้ข้อความเดิมและรูปแป้นเดิม
- ที่ 1280×720 ให้ rail อยู่ใน document flow และเลื่อนหน้าได้ เพื่อไม่ให้ rail บังรูปแป้นหรือ speech cue; ที่จอสูงยังใช้ sticky rail เดิม
- เมนูกลางไม่เพิ่ม `[data-pedal-target]` และไม่เปลี่ยนขอบเขตวงเลือก ภาษาเสียงยังเป็นไทยตาม adapter เดิม
- ไม่เปิดไมค์ ไม่แก้ร่าง และไม่ยืนยันผลตรวจในการทดสอบรอบนี้ การตรวจนี้ไม่ยืนยันความแม่นยำของ STT หรือฮาร์ดแวร์จริง

- เหนือแถวปุ่มเหลือข้อความ “เลือก” พร้อมรูปแป้นกลาง
- หัวเว็บไม่มี mic status box; ในหน้า lookup มีไฟ 1 ดวงอยู่ภายใน search form ก่อนปุ่มค้นหา ไม่มีข้อความไมค์ที่มองเห็น แต่ชื่อสถานะยังอยู่ใน accessibility tree
- ที่ 1280×720 ไฟมีช่อง 36×36px อยู่ภายในช่องค้นหา ไม่ล้นแนวนอน; ไฟสี/แสงใช้ CSS phase เดิม ไม่เปลี่ยนการเปิดปิดไมค์
- เข้า record ตรวจไฟ 1 ดวงข้างเวลาใน report metadata; เปิดคู่มือแล้วไฟย้ายเข้า dialog มีเพียง 1 ดวงที่มองเห็น และไม่ทับปุ่มปิด (`lamp right=899`, `close left≈944`)
- ปิดคู่มือด้วยกลาง กลับ case ด้วยซ้ายสองครั้ง และคืนขนาดจอเดิม ไม่มีการแก้ข้อความร่าง
- TypeScript และ ESLint ผ่าน; รอบนี้ปรับการแสดงผล ไม่เปลี่ยน controller หรือ STT lifecycle และไม่ได้เปิดไมค์จริง

## รอบสถานะคำร้องและฮินต์ไอคอน UI 2.4

- 0039 ที่ยังรอ OCR: แสดงกล่องแดงใต้ช่องค้นหา อธิบายว่าต้องรอ OCR และยืนยันข้อมูลก่อน ปุ่มเริ่มบันทึก disabled ไม่มี toast อ้างว่ามีร่างแล้วทำต่อได้
- 0038 ที่พร้อมใช้งานและมีร่าง: กล่องเขียว “พร้อมบันทึกผล · มีฉบับร่างเดิม” และปุ่มเริ่มบันทึก enabled; การมีร่างไม่เปลี่ยนเงื่อนไขอนุญาตของคำร้อง
- ตำแหน่งสถานะอยู่ถัดจากช่องค้นหา 12px ในจอใหญ่ ไม่เป็น foot target เพิ่ม
- คำแนะนำเหนือแถวปุ่มใช้ “กดเพื่อเลือก”; รูปแป้นไม่มีข้อความชื่อซ้าย/กลาง/ขวาที่มองเห็น (textContent ว่าง) แต่ accessibility tree มี image แป้นซ้าย/กลาง/ขวาตามตำแหน่งจริง
- ที่ 1280×720 กล่องเขียวกับเนื้อหา lookup อยู่เหนือ rail (`lookup bottom≈519`, `rail top≈536`), `scrollHeight=720`, ไม่มีล้นแนวนอน ตรวจกล่องแดงและคืน 0039 หลังตรวจโดยไม่แก้ข้อความในร่าง
- TypeScript, ESLint และ 18 tests ผ่าน เพิ่มตรวจเหตุผลที่บล็อก OCR/ข้อมูลคำร้อง/เลขการตรวจให้ตรงกับ gate เดียวของ readyForRecording
- การอ่านร่างล้มเหลวและปุ่ม retry ตรวจจากโค้ด ยังไม่ได้จำลอง IndexedDB failure ในเบราว์เซอร์

## รอบค้นหาต่อเนื่อง UI 2.3

- หน้า case ไม่มี `.station-case-bar` ซ้ำด้านบน เลขการตรวจอยู่ในบัตรรายละเอียด ส่วน record/review ยังมีแถบระบุเคส
- ช่องค้นหา ตัวอย่าง รูปแป้นและวิธีพูดยังมองเห็นหลังพบคำร้อง; ใน lookup มี 0 foot targets เพิ่ม วงเลือกด้านล่างยังมีเพียงค้นหา/เริ่มบันทึก
- ฉีดผลถอดเสียงจำลอง “ศูนย์ ศูนย์ สาม หก” ผ่าน dev dispatcher ขณะอยู่ case 0038: ช่องเปลี่ยนเป็น 0036 และบัตรเป็น REQ-2569-0036 โดยไม่กดกลับ จากนั้นพิมพ์ 0038 ในช่องเดิมแล้วค้นหาคืนได้
- กลางกดสั้นเข้าบันทึกหลังค้นหาซ้ำได้ และซ้ายสองครั้งกลับ case พร้อมส่วนค้นหาเดิม; ร่างข้อความเดิมไม่ถูกแก้
- ที่ 1280×720 ส่วน lookup ทั้งหมดอยู่เหนือแถบคำสั่ง (`lookup bottom≈519`, `rail top≈536`), `scrollHeight=720`, ไม่ล้นแนวนอน
- TypeScript, ESLint และ 17 tests ผ่าน รวมตรวจคำแนะนำค้างกลางของ case ว่ารับเลขคำร้อง ไม่ได้ทดสอบ STT ผ่านไมค์จริงในรอบนี้

## รอบปรับฮินต์ ไฟไมค์ และ overlay UI 2.2

- กลางกดเพื่อทำงานอยู่กึ่งกลางเหนือปุ่ม คำแนะนำค้างพูดย้ายไปกรอบสถานะไมค์ด้านบน ไม่มีคำแนะนำเสียงซ้ำใต้แถบคำสั่ง
- เปิดตัวจำลองที่ 1896×1244 แล้ววัด main/card/rail ก่อนและหลัง: ตำแหน่งและขนาดเหมือนเดิมทุกค่า (`main x=288 width=1320`, `card x=568 width=760`, `rail x=0 width=1896`) ไม่มี padding กันพื้นที่หรือเปลี่ยนขนาด dialog ตามแผงเดฟ
- ที่ 1280×720 เห็นแถวคำสั่ง 5 ปุ่มครบ ไม่มีล้นแนวนอน บัตรคำร้องอยู่เหนือแถบคำสั่ง (`card bottom≈493`, `rail top≈536`); ฮินต์กลางอยู่เหนือปุ่ม (`hint bottom≈576`, `buttons top≈588`)
- เปิดคู่มือด้วยขวาสองครั้ง: ไฟไมค์ที่มองเห็นมี 1 ชุด อยู่ใน dialog บนสุด (`lamp bottom=60`, `dialog top≈72`) ไม่ถูก backdrop กลบและไม่บังปุ่มปิด กลางปิดคู่มือกลับ record ได้
- ตรวจภาพ component ไฟจริงครบ 4 props บนหน้า QA ชั่วคราว: off เทา, starting เหลือง, listening แดงมี glow, processing เหลืองพร้อมข้อความไมค์ปิดแล้ว; หน้า QA ไม่เปิดไมค์และถูกลบหลังตรวจ ไม่อ้างภาพ preview ว่าเป็นการรับเสียงจริง
- TypeScript, ESLint และ 17 tests ผ่าน เพิ่มกรณีแยก recognition request ออกจาก audio capture start/end เพื่อไม่ขึ้นไฟแดงตอนเพิ่งขอเปิดไมค์
- คืนหน้าคำร้อง ขนาดจอเดิม และปิดตัวจำลองหลังตรวจ ไม่แก้เนื้อหาร่าง ยังไม่ได้ทดสอบไมค์หรือ footswitch จริง

## รอบปรับฮินต์ UI 2.1

- ฮินต์ซ้าย/ขวาพร้อมลูกศรอยู่ขนาบแถวปุ่มและอยู่ระดับเดียวกัน ไม่ซ้ำใต้แถวหลัก
- หน้า case สองปุ่ม: ซ้ายเลือกเปลี่ยนคำร้อง ขวาเลือกเริ่มบันทึก กลางเปิดหน้าบันทึกได้จริง
- หน้า record ที่ 1280×720: มีเป้าหมาย 5 จุดเท่าเดิม ฮินต์ไม่เป็นเป้าหมายเพิ่ม ไม่มีล้นแนวนอน ทุกปุ่มอยู่ y≈549–637; ฮินต์อยู่ y≈579–607 ไม่ทับปุ่ม
- TypeScript และ ESLint ผ่านสำหรับการแก้รอบนี้ ไม่เปลี่ยน gesture mapping; ผล 16 controller tests ด้านล่างเป็นรอบฐาน UI 2.0
- คืนหน้าบัตรคำร้องและยกเลิก viewport override หลังตรวจ ไม่มีการแก้เนื้อหาร่าง

## การตรวจในเบราว์เซอร์รอบฐาน UI 2.0

| พื้นที่ | สิ่งที่ตรวจ | ผลที่เห็น |
| --- | --- | --- |
| เริ่มงาน | ค้นหา 0038 → บัตรเคส → เริ่มบันทึก | ไปหน้าบันทึกได้ ตัวอย่างข้อมูลเป็นข้อความบรรทัดเดียว |
| ค้นหาไม่พบ | 9999 แล้วซ้ายสองครั้ง | แจ้งไม่พบคำร้อง แล้วล้างคำค้นได้ |
| ค้นหาหลายผล | 003 → ขวา → กลาง | เปิด results dialog เลือก 0039 ด้วยเท้าได้ ไม่เลือกเนื้อหาหน้า standby |
| คำร้องไม่พร้อม | 0039 รอ OCR และไม่มี accession | เริ่มบันทึก disabled ค่าเริ่มต้นอยู่ที่เปลี่ยนคำร้อง |
| ขอบเขตหลัก | ตรวจ DOM ของหน้าบันทึก | rail มี 5 เป้าหมาย: โหมดเสียง, Part, ร่าง, ตรวจสอบ, เครื่องมือ; header และรายงานมี 0 เป้าหมาย |
| การเลือก | ใช้ซ้าย/ขวาและกลางผ่านคีย์ทดลอง | เลือกเฉพาะแถบคำสั่ง; ซ้ายจากรายการแรกวนไปเครื่องมือ ไม่ไปหัวเว็บหรือเนื้อหารายงาน |
| Part | เปิด picker ด้วยเท้า → B → กลาง | dialog มี A–E เท่านั้น ปิดแล้วแสดง Part B จริง; คืน Part A ก่อนจบรอบ |
| โหมดเสียง | เปิดด้วยกลาง แล้วเลือกบอกผล | มีสองตัวเลือก บอกผล/พูดคำสั่ง กลับสู่แถบคำสั่งหลังเลือก |
| เครื่องมือ | เปิดด้วยเท้า | มีชุดไอคอนเฉพาะรายการรอง รายการ disabled ถูกข้าม |
| ยกเลิกข้อความ | เครื่องมือ → เพิ่มข้อความ → ใส่ข้อความชั่วคราว → ซ้ายสองครั้ง | กลับเครื่องมือโดยไม่เพิ่มข้อความในรายงาน |
| แก้ไขข้อความ | review → เลือกบรรทัด → แก้บัฟเฟอร์ → บันทึก | รายงานเปลี่ยนหลัง commit; ใช้ Undo คืนข้อความเดิมและบันทึกร่างแล้ว |
| รายงาน | ตรวจหน้าบันทึก/ตรวจสอบ | เนื้อหาอ่านอย่างเดียว ไม่มีคำแนะนำเหยียบแทรกในข้อความ |
| ยืนยัน | กดกลางสั้นใน dialog ยืนยัน | ยังคงอยู่ใน dialog ไม่ยืนยันผล |
| คู่มือซ้อน dialog | เปิดคู่มือจากหน้าต่างยืนยัน แล้วกลางปิด | กลับหน้าต่างยืนยันเดิม ไม่มีการทำงานของฉากหลัง; ซ้ายสองครั้งยกเลิกกลับ review |
| จอ 1280×720 | หน้าบันทึกและแถบคำสั่ง | เห็นครบ 5 ปุ่ม ไม่มีล้นแนวนอน; ปุ่มอยู่ y≈549–637 ภายใน viewport; gesture ใช้ 18px |
| ตัวจำลองจอเล็ก | เปิดแป้นสามปุ่ม | panel bottom≈373 อยู่เหนือ rail top≈538 ไม่บังปุ่มคำสั่งด้านล่าง |
| dialog จอเล็ก | เปิด Part ขณะเปิดตัวจำลอง | dialog อยู่ด้านซ้าย ตัวจำลองด้านขวา ตัวเลือกทั้งห้ามองเห็นครบ |
| เคสยืนยันแล้ว | เปิด 0041 ที่ยืนยันไว้ก่อนรอบนี้ | แก้ข้อความ/บันทึกร่าง disabled เปิดอ่าน → เสร็จสิ้น → เคสถัดไป → standby ได้ด้วยกลาง โดยไม่มีการยืนยันใหม่ |

รอบ QA ไม่ยืนยันผลใหม่ และคืนการแก้ไขชั่วคราวในร่างเดิมก่อนส่งงาน

## ตรวจเชิงโค้ดและอัตโนมัติ

- TypeScript และ ESLint ของไฟล์ที่เปลี่ยนผ่าน
- `npm run test:examinations`: 16 tests ผ่าน ครอบคลุม gesture ใน 15 contexts, single/double tap, hold threshold, cancellation, repeat, busy, confirmation target, ข้อมูลตัวอย่าง และ adapter STT
- Focus ใช้ allowlist `[data-pedal-target]` ใน rail หรือ dialog บนสุดเท่านั้น; ไม่มี generic button/input/link scan
- ตรวจโค้ด lifecycle ไมค์: release/cancel/blur/context change หยุด recognition/media tracks และไม่ใช้ผลจาก session เก่า; chooser ที่ไม่มีช่องข้อความไม่เปิดไมค์
- ตรวจโค้ด playback: เปิดได้เมื่อมี clip, select/range ใช้กลางเริ่ม/จบการปรับและซ้าย/ขวาปรับค่า
- คำสั่งเลื่อนส่งไปที่รายงานที่เลื่อนภายในหรือ dialog ปัจจุบัน ไม่เลื่อนฉากหลังของ modal

## ขอบเขตที่ยังไม่ได้พิสูจน์

- ยังไม่ได้ทดสอบ footswitch จริงหรือเปิดไมค์วัดความแม่นยำ STT ภาษาไทย
- ไม่มี clip จริงในเคส QA จึงยังไม่ได้ฟังหรือเลื่อนเสียงจริงในเบราว์เซอร์
- การผ่าน controller tests ไม่ใช่หลักฐานว่าบริการ SpeechRecognition หรือฮาร์ดแวร์ทำงานจริง
- ไม่ได้ยืนยันผลใหม่ ใช้เคส 0041 ที่ยืนยันไว้เดิมตรวจหน้าสำเร็จ
- Production build เคยติดการเริ่ม CSS worker ของ Turbopack; รอบนี้ไม่ได้รันซ้ำและไม่อ้างว่า build ผ่าน

สเปกปุ่มและแต่ละขั้นอยู่ใน `examinations-interaction-spec.md` เวอร์ชัน 2.5

## Patient context layout — 7 November 2026

- Browser checked the existing confirmed fixture 0038 without editing or confirming its draft. Removed the examination branding row; shared portal branding remains. Corner help opens/closes the existing dialog.
- Checked 1896×1244 with the simulator open: patient context and report occupy separate columns, with space on the right for a future panel. The simulator remains an overlay.
- Checked 1280×720 after the final height adjustment: page height equals the viewport, no horizontal overflow, report/context have independent scrolling, and the bottom actions and corner help remain visible. Context contains zero pedal targets.
- Empty clinical fields are labelled ไม่ระบุ; prior examination history is explicitly not connected. No backend or history data was added.
- Typecheck, changed-component ESLint, all 24 examination tests and all 4 Vitest unit tests passed after installing the dependencies introduced by the GitHub update. The committed lockfile was preserved.
- Production build failed while starting the Turbopack CSS worker, both inside and outside the sandbox (station.css/globals.css). No successful production build is claimed. Hardware, microphone and real STT were not tested in this pass.

## Compact workstation refinement — 7 November 2026

- Browser checked the existing confirmed 0038 draft without writing or confirming it. At 1896×1244 the context is 420px wide; the report is 720×520px. Default computed context values/labels are 16px/14px; transcript text is 18px.
- Two-column identifiers, origin/doctor and short specimen fields reduce vertical scanning; prose remains full-width. Hospital/doctor now follows reference numbers. No fields were removed or history invented.
- At 1280×720 the final layout has no horizontal overflow and page height equals viewport height; the action rail and corner help remain visible. Restored the viewport override after checking.
- Typecheck and component ESLint passed. This refinement changes presentation only; pedal, dictation and persistence behavior is unchanged. The previously recorded Turbopack production-build limitation remains unresolved; no successful build is claimed in this pass.

## Shared biopsy reference — 8 November 2026

- Read the attached blank form visually and transcribed its reusable biopsy wording, alternatives and blanks. Added a single right reference card for record/review; selecting Part B updates the heading while retaining the same template body. All report headings now describe specimens, including an existing draft with old clinical-section titles.
- Browser checked existing confirmed fixture 0038 without changing or confirming report data. At 1896×1244 checked with simulator open, then switched A to B through Part adjustment. At 1280×720 the three cards remain within the viewport width and the reference text scrolls independently. Restored viewport override afterwards.
- Browser DOM confirms exactly one reference card and zero pedal targets within it. No automatic template insertion or specimen/container count inference was added. Final proportions have deliberately not been settled.
- Typecheck, changed-file ESLint and all 24 examination tests passed. Hardware, microphone and real STT were not tested. Production build was not rerun; the prior Turbopack CSS-worker limitation remains recorded.

## Final three-column layout and label audit — 8 November 2026

- Removed specimen captions from all Part headings and removed the active-Part caption and “(มากกว่า 1 ขวด)” note from Biopsy. Biopsy and Surgical number share a single header row.
- Six numbered template sections preserve dictation order and source terms; 34 pale indigo alternatives/optional phrases are visually distinct from the sentence scaffold. Blanks have dotted underlines and accessible value labels. Stable section/choice attributes support a future matcher; no speech-coverage state is fabricated and the reference remains outside the pedal target cycle.
- Removed empty optional context rows/groups. Kept one explicit missing-clinical-information message and the distinct unavailable-history message. Required patient identity and all populated source values remain.
- Browser checked existing confirmed case 0038 without modifying/confirming report contents. At 1896×1244 widths are 320/1029/420px for patient/report/template; the central report is largest and all cards align. Checked with simulator open (still an overlay). At 1280×720 final widths are 280/568/320px, page height equals viewport height and there is no horizontal overflow. Identifier values remain readable in two columns. Reset viewport override afterwards.
- Typecheck, changed-file ESLint and all 24 examination tests passed. Corrected a temporary CSS selector typo found by the browser; the final page renders without a build-error overlay. Production build was not rerun; the prior CSS-worker limitation remains unresolved. No real microphone/STT/hardware test was performed.

## Focused shell and separate home action — 8 November 2026

- Removed portal branding/preferences/sign-out from examination only; no extra footer row. Shared header remains on portal home and other modules, using route-aware `PortalFrame`.
- Home and help now occupy left/right free areas of the existing command rail. Restored/preserved the original left-double-tap back example, independently from home navigation. Both new pointer controls are excluded from pedal selection.
- Browser verified home from existing confirmed fixture 0038 navigates to `/portal`, where branding/preferences/sign-out return, and entering examination removes them again. No report edits or finalization were performed. Home's unsaved-save/failure branch was inspected in code, not forced by corrupting browser storage.
- Checked 1896×1244 and 1280×720. At 1280×720 the report gains about 109px vertical space versus the prior 420px card, there is no page overflow, and home/help centers both measure y=641.8px within the same rail. Header count is zero; the original ×2 กลับ instruction remains visible. Help opens/closes its existing dialog. Reset viewport after checking.
- Typecheck, changed-file ESLint and all 24 examination tests passed. Production build was not rerun; prior Turbopack CSS-worker limitation remains. No real hardware/STT was tested.

## User-requested reset of 0038 — 8 November 2026

- User explicitly requested resetting local case 0038. Both open user tabs were on standby, so neither held active report edits. Opened only REQ-2569-0038, used the development reset control, and observed the state change from confirmed/open-report to พร้อมเริ่มบันทึกผล / เริ่มบันทึก. Closed the simulator and left the case ready to start; did not begin recording or confirm a report.
- The original IndexedDB draft is retained under a request-specific backup key for the restore control. Other requests were not cleared. Reset was exercised in the browser; restore was not executed because it would undo the user's requested reset.

## Stable lookup with long clinical fixture — 8 November 2026

- Browser checked fixture 0038 on the case/lookup screen, without entering recording, changing dictated text or confirming a report. It remains พร้อมเริ่มบันทึกผล after the earlier user-requested reset.
- At 1896×1244 search form before/after successful lookup had identical x/y/width; its center equals viewport center (948px). Left context card is independently scrollable, has zero foot targets, and renders the multi-paragraph referring-doctor note (945 characters) plus other clinical/specimen data. Checked with simulator open; it does not move the lookup.
- At 1280×720 search form stayed at x=336, y=115.14, width=608 before and after a match; failed lookup also produced x/y shift zero. Page height equals 720 and there is no horizontal overflow. Restored 0038 after the failed-search check, closed simulator and reset viewport override.
- All 24 examination tests and 4 unit tests, TypeScript and changed-file lint passed. Production build was not rerun; prior Turbopack CSS-worker limitation remains. Real STT/hardware not tested.
