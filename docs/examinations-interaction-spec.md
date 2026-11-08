# Examination workstation — interaction spec

เอกสาร **2.8** · UI **2.8** · 29 ตุลาคม 2026 · `/portal/examinations`

เวอร์ชันนี้แทนวิธีเลื่อนกรอบทั้งหน้าของ UI 1.x ใช้แถบคำสั่งไอคอนและหน้าต่างย่อยที่จำกัดรายการให้เห็นตรงหน้า

## ขอบเขตการเลือก

ปรับส่วนกลาง 2 พฤศจิกายน 2026: หน้า workstation อยู่ใต้ Navigation ของ Portal โดยเมนูภาษาและขนาดตัวอักษรไม่เป็น foot target ขนาดตัวอักษรใช้ rem (100% เท่าขนาดเดิม) และ shell ใช้พื้นที่ที่เหลือจากหัวเว็บ บนจอสูงไม่เกิน 900px ให้ command rail อยู่ใน document flow เพื่อไม่ทับเนื้อหาเมื่อเพิ่มหัวเว็บ; หน้าเลื่อนแนวตั้งได้ตามพื้นที่ที่ต้องใช้ การเลือกเป้าหมายและ gesture mappings คงเดิม

`use-examination-focus.ts` เลือกเฉพาะ `[data-pedal-target]` ภายใน root ปัจจุบัน: แถบคำสั่งด้านล่าง หรือ native dialog บนสุด ไม่มีการค้นหา button/input/textarea/link ทั่วหน้าอัตโนมัติ

หัวเว็บ รายงาน แถบสถานะ Part ข้อความแจ้งเตือน และตัวจำลองเดฟ **ไม่อยู่ในวงเลือก** ช่องกรอกข้อความจะเลือกได้เฉพาะเมื่อเปิดหน้าต่างเพิ่ม/แก้ข้อความโดยตรง ปุ่ม X ใน dialog เป็น mouse fallback; เท้าใช้ซ้ายสองครั้งปิดได้เสมอ

## ปุ่มเท้าและคีย์

| แป้น | อุปกรณ์ / คีย์ทดลอง | กด 1 ครั้ง | กด 2 ครั้งเร็ว ๆ | ค้าง |
| --- | --- | --- | --- | --- |
| ซ้าย | F13 / F8 | เลือกคำสั่งก่อนหน้าในชุดปัจจุบัน | กลับ / ปิดหน้าต่าง | ไม่มีคำสั่งเพิ่ม |
| กลาง | F14 / F9 | ทำงานที่เลือก | ไม่แยกคำสั่งแตะคู่ | เปิดไมค์หลัง 250ms ปล่อยหยุดรับเสียง |
| ขวา | F15 / F10 | เลือกคำสั่งถัดไปทันที | เลื่อนสองรายการ ไม่เปิดคู่มือ | ไม่มีคำสั่งเพิ่ม |

แตะคู่มีช่วงตรวจจับ 350ms; เฉพาะซ้ายที่อยู่นอกโหมดปรับ Part จึงรอช่วงนี้ ขวาตอบสนองทันที กลางกดสั้นไม่เปิดไมค์ คีย์ repeat ไม่เริ่มงานซ้ำ เปลี่ยน context/blur/ซ่อนแท็บยกเลิก gesture ที่ค้างและ action ที่รอ ไม่ให้ข้ามไปทำงานในบริบทใหม่

ข้อยกเว้น: เมื่อเลือกปุ่มยืนยันผลใน dialog ยืนยัน ขวาต้องค้าง **3 วินาทีแล้วปล่อย** จึงยืนยัน ไม่เปิดไมค์ กลางกดสั้นไม่ยืนยัน ปุ่มยืนยันที่กด pointer โดยตรงเลือกตัวเองก่อนเริ่ม hold

## วงคำสั่งของแต่ละหน้า

| ขั้น | หน้า | รายการที่เท้าเลือกได้ | ค่าเริ่มต้น |
| --- | --- | --- | --- |
| 1 | standby | คู่มือ, ค้นหาคำร้อง | ค้นหาคำร้อง |
| 1 | case | ค้นหาคำร้อง, เริ่มบันทึก/เปิดผลตรวจ, คู่มือ | เริ่มบันทึกถ้าพร้อม; ไม่พร้อมเลือกค้นหาคำร้อง |
| 2 | record | Part ปัจจุบัน, แก้ล่าสุด, ตรวจสอบผล, เครื่องมือ | Part ปัจจุบัน |
| 3 | review | Part ปัจจุบัน, แก้ข้อความ, ยืนยันผล, เครื่องมือ | ยืนยันผล |
| 3 | review ที่ยืนยันแล้ว | Part ปัจจุบัน, เคสถัดไป, เครื่องมือ | เคสถัดไป |

แสดงเฉพาะคำสั้นและไอคอน ไม่มีคำแนะนำซ้ำใต้ทุกปุ่ม คำสั่ง disabled ยังคงเห็นอยู่แต่ไม่อยู่ในวงเลือก เช่น ยังไม่มีผล/เสียงจึงเข้าตรวจสอบไม่ได้ หรือเคสยืนยันแล้วแก้ไขไม่ได้

เก็บร่างอัตโนมัติ ไม่มีปุ่มบันทึกร่างปกติใน rail หากบันทึกล้มเหลวจึงเพิ่ม “ลองบันทึกอีกครั้ง” ในวงเลือก หลังยืนยันยังเห็นรายงานเดิมแบบอ่านอย่างเดียวพร้อมสถานะล็อกในเครื่องและเคสถัดไป ไม่มีหน้าสำเร็จแยก

เลือกปุ่ม Part แล้วแตะกลางเพื่อเข้าสู่การปรับในหน้าเดิม ซ้าย/ขวาเปลี่ยน Part ของรายงานทันที กลางอีกครั้งจบการปรับ; ซ้าย/ขวากดรัวได้ทุกครั้ง ไม่มีแตะคู่ย้อนกลับขณะเลือก Part ต้องกดกลางเพื่อจบก่อน ระหว่างปรับ Part ไม่เปิดไมค์ แถบคำสั่งแสดงว่ากำลังเลือก Part และคืนการเลื่อนคำสั่งหลังจบ

## หน้าต่างย่อย

| Context | เปิดจาก | รายการให้เลือก | กลับ |
| --- | --- | --- | --- |
| results | ค้นหาตรงหลายรายการ | การ์ดผลค้นหา | standby |
| tools | เครื่องมือ | เพิ่มข้อความ, แก้บรรทัดอื่น, ฟังเสียง, ย้อนการแก้ไข, ทำซ้ำ, พูดคำสั่ง, คู่มือ, กลับ | หน้าหลัก |
| lines | แก้ข้อความ / เครื่องมือ | บรรทัดใน Part ปัจจุบันเท่านั้น | บริบทที่เปิด |
| entry | เพิ่มข้อความ | ช่องข้อความ, กลับ, เพิ่มข้อความ | tools |
| edit | เลือกบรรทัด / แก้ล่าสุดบน rail | ช่องข้อความ, กลับ, บันทึกข้อความ | บริบทที่เปิด: หน้าหลัก, lines หรือ tools |
| playback | ฟังเสียง | เลือกช่วง, เล่น/พัก, ตำแหน่งเสียง | tools |
| help | ปุ่มคู่มือบน standby/case / เครื่องมือ → คู่มือ / หัวเว็บ / คำสั่งเสียง “ช่วยเหลือ” | ปิด, เลื่อนขึ้น, เลื่อนลง | บริบทก่อนเปิด |
| confirm | ยืนยันผลจาก review | กลับไปตรวจผล, ยืนยันผลตรวจ | review |

ตัวเลือกแรก/ค่าปัจจุบันใช้ `data-pedal-default` และ focus จริงต้องตรงกับกรอบเลือก เมื่อปิด chooser หรือคู่มือซ้อน ให้คืนกรอบที่ตัวควบคุมเดิมทั้งการเปิดด้วยเท้าและ pointer; ใช้ default เมื่อเข้าสู่หน้าหลักใหม่หรือเป้าหมายเดิมใช้ไม่ได้ หากรายการ disabled หลังทำงาน ให้เลือกค่าเริ่มต้นใหม่ (เก็บตำแหน่ง field ที่ disabled ชั่วคราวระหว่างรับเสียงได้) การปรับ Part แสดงหัวข้อจริงในรายงานโดยไม่เปิดหน้าต่าง

Select/range ใน playback: กลางเริ่มปรับ ซ้าย/ขวาปรับค่า กลางจบการปรับ ซ้ายสองครั้งจบการปรับก่อนปิดในครั้งถัดไป การปรับเวลาใช้ `data-pedal-step=5` วินาทีและจำกัดช่วงต้น/ท้ายเสียง ส่วน native `step=.1` คงไว้สำหรับ pointer เปิดฟังทวนโดยเลือกช่วงเสียงของ Part ปัจจุบันก่อน และแสดงเวลาปัจจุบัน/ทั้งหมด

## เสียงและข้อความ

- ไมค์ปิดอยู่จนเหยียบกลางค้าง หน้าหลัก record ปกติบอกผลลง Part ปัจจุบันเสมอ ไม่มีโหมดเสียงแบบค้างอยู่
- เครื่องมือ → พูดคำสั่ง เตรียมรับคำสั่งหนึ่งครั้งเท่านั้น แสดงปลายทางคำสั่งให้เห็น แล้วผู้ใช้ต้องเหยียบค้างเอง ไม่เปิดไมค์อัตโนมัติ เมื่อใช้/ยกเลิกกลับสู่บอกผล ไม่เดาจากเนื้อหาว่าประโยคเป็นคำสั่งหรือผลตรวจ
- standby/case กลางค้างรับเลขคำร้องในช่องค้นหาเดียวกัน; case ยังส่งคำสั่งนำทางเดิม เช่น “ไปต่อ” ให้ dispatcher ได้ ส่วน review/help กลางค้างรับคำสั่ง
- entry/edit กลางค้างส่งข้อความเข้าบัฟเฟอร์ของช่องที่เลือก ต้องกดเพิ่ม/บันทึกจึงเปลี่ยนรายงาน ย้อนออกทิ้งบัฟเฟอร์
- “แก้ล่าสุด” บน rail เปิดบัฟเฟอร์แก้บรรทัดล่าสุดของ Part ปัจจุบันโดยตรง ข้อความที่เพิ่งเพิ่มจะเน้นชั่วครู่ และเลื่อนตามเฉพาะเมื่อผู้ใช้ดูอยู่ใกล้ท้ายรายงานก่อนเพิ่ม ห้ามดึงจอจากตำแหน่งอ่านย้อนหลัง
- tools/results/lines/playback เป็น chooser ไม่มีการเปิดไมค์และไม่แสดงคำแนะนำให้พูด
- ช่วงอนุญาตไมค์ ถ้าปล่อยก่อน getUserMedia สำเร็จ ต้องปิด stream ที่ได้ภายหลังโดยไม่เริ่มอัด Release/cancel/blur/context change หยุด recognition/media tracks และยกเลิกผลที่ตามมาจาก session เก่า
- Web Speech adapter `th-TH` ยังเป็นของชั่วคราว อาจผ่านบริการเบราว์เซอร์ ไม่ใช่ STT โรงพยาบาล การมี constructor ไม่ยืนยันว่าบริการทำงาน ต้องเตรียม permission ก่อนใช้ hands-free

ไฟไมค์แสดงเฉพาะวงกลม ไม่มีกรอบหรือข้อความสถานะบนหัวเว็บ อยู่ในช่องค้นหาข้างปุ่มค้นหาบน standby/case; record/review อยู่ข้างข้อมูลเวลาของรายงาน และ dialog ใช้ไฟในหน้าต่างบนสุด มีเพียงหนึ่งชุดที่ใช้งาน: เทา = ปิด, เหลือง = กำลังเปิดหรือประมวลผล, แดงเรืองแสง = กำลังรับเสียง ชื่อสถานะยังประกาศให้โปรแกรมอ่านหน้าจอผ่านข้อความที่ซ่อนจากสายตา ช่องไฟใน search มีขนาดคงที่แม้เปิด dialog

โหมด search/command/field รอ `onaudiostart` ของ SpeechRecognition ก่อนขึ้นไฟแดง ไม่ขึ้นเพียงเพราะเรียก start(); `onaudioend` เปลี่ยนเป็น processing โหมด dictation ใช้ MediaRecorder หลังได้ stream แล้ว Late callbacks หลังปล่อย/ยกเลิก session ต้องไม่ทำให้ไฟแดงกลับมา ไม่อ้างความแม่นยำ STT จากไฟนี้

## ข้อมูลและคำสั่ง

ข้อมูลทดลองเป็นข้อความบรรทัดเดียวเท่านั้น: **0038** พูด “ศูนย์ ศูนย์ สาม แปด” หรือ **0036** ไม่เพิ่มปุ่มเติมข้อมูลทดลอง ค้นหา typed/speech ใช้ช่องเดียว ตรงหนึ่งผลเปิดบัตรเคส; หลายผลเปิด results; ไม่พบคงหน้าเดิม คำร้องต้องสแกนแล้ว/พร้อมใช้/มี accession จึงเริ่มบันทึก

เมื่อพบคำร้องแล้ว ยังคงช่องค้นหา ตัวอย่าง รูปแป้น และวิธีพูดไว้ในส่วน lookup เดิม แสดงบัตรรายละเอียดด้านข้างบนจอห้องปฏิบัติการ จึงพูดเลขใหม่หรือพิมพ์ค้นหาได้ทันทีโดยไม่กดกลับ เมื่อเปลี่ยนคำร้องเก็บร่างเคสเดิมก่อนอ่านเคสใหม่ ไม่แสดง case bar ซ้ำเหนือบัตร เลขการตรวจย้ายมาอยู่ในบัตร ส่วน record/review ยังมี case bar ระบุเคสปัจจุบัน

สถานะเข้าบันทึกแสดงใต้ช่องค้นหา: เขียวเมื่อ OCR เสร็จ ข้อมูลคำร้องยืนยันแล้ว (`พร้อมใช้งาน`) และมีเลขการตรวจ; แดงพร้อมเหตุผลเมื่อยังขาดเงื่อนไข เช่น “รอผล OCR และยืนยันข้อมูลคำร้องก่อน” ใช้ `recordingBlockReason` เดียวกับ `readyForRecording` การมีร่างเก่าไม่เปลี่ยนสิทธิ์นี้ ไม่แสดง toast “มีงานที่บันทึกไว้ ทำต่อได้” อีก ถ้าอ่านร่างผิดพลาดแสดงแดงและเปลี่ยนปุ่มเป็นลองเปิดคำร้องอีกครั้งแทนการอ้างว่าเริ่มได้

คำสั่งในโหมดคำสั่งยังรองรับ: ไปต่อ, ย้อนกลับ, ช่วยเหลือ, ไป Part B, หัวข้อถัดไป/ก่อนหน้า, บันทึกฉบับร่าง, ย้อนการแก้ไข, ทำซ้ำ, แก้บรรทัดที่ 2 เป็น …, ลบบรรทัดที่ 2, แก้ข้อความล่าสุดเป็น …, ลบข้อความล่าสุด, เล่นเสียง/พักเสียง, เลือกช่วงเสียงที่ 2, ช่วงเสียงถัดไป/ก่อนหน้า, ย้อนห้าวินาที และเลื่อนขึ้น/ลง

เลื่อนขึ้น/ลงเลื่อนพื้นที่รายงานภายในเมื่ออยู่หน้าบันทึก/ตรวจสอบ หรือเนื้อหาของ dialog ปัจจุบัน ไม่ส่งไปเลื่อนฉากหลัง

ข้อความและ Blob เสียงเก็บใน IndexedDB ตาม request ID นำข้อความร่างเก่า sessionStorage กลับมาได้ การยืนยันล็อกในเครื่องเท่านั้น ยังไม่ใช่การส่ง backend หรือเซ็นผลจริง

หน้า review แสดงเนื้อหาทุก Part ต่อเนื่องพร้อมสถานะว่าง แยกจากหน้าบันทึกที่แสดง Part ปัจจุบัน ไม่ตีความ Part ว่างว่าผิดหรือยังไม่ได้ตรวจ หน้ายืนยันแสดงเลขคำร้อง HN เลขการตรวจ และภาพรวม Parts พร้อมผลของการล็อกในเครื่องก่อนเริ่มค้างยืนยัน

Feedback แยก error/success/info และอยู่ในบริบทที่มองเห็น: หน้าต่างบนสุดมีข้อความของตัวเอง ไม่ปล่อย error ไว้หลัง backdrop ข้อความสำเร็จหายเอง ข้อผิดพลาดคงอยู่ให้แก้หรือลองใหม่ โดย retry ต้องอยู่ในชุดเป้าหมายของบริบทปัจจุบัน ไม่ทำให้เท้าเลื่อนทั่วหน้า

## รูปแบบ UI

- มีจุดควบคุมหลักเพียงแถบไอคอนด้านล่าง กรอบเขียวไม่ไปล้อมข้อความรายงานหรือหัวเว็บ
- รายงานอ่านอย่างเดียว เปิดแก้ผ่าน rail → เลือกบรรทัด → edit dialog
- คำอธิบาย/gesture ทุกจุดใช้ `--hint:18px` ขนาดเดียว ตัวอย่างข้อมูลใช้ 18px เช่นเดียวกัน เนื้อหาผลตรวจ 22px หัวข้อใหญ่กว่าตามลำดับชั้น
- แถวคำสั่งหลักที่มีหลายปุ่ม: แป้นซ้ายพร้อมลูกศรซ้ายขนาบฝั่งซ้าย แป้นขวาพร้อมลูกศรขวาขนาบฝั่งขวา อยู่ระดับเดียวกับปุ่มและไม่ใช่เป้าหมายที่กดได้; แถวปุ่มเดียวไม่แสดงทิศทาง
- ไอคอนแป้นกลางพร้อม “เลือก” อยู่กึ่งกลางเหนือแถวปุ่ม ใต้แถวเหลือทางลัดกลับ/คู่มือ ไม่มีกรอบคำแนะนำไมค์บนหัวเว็บ ส่วน lookup ยังมีวิธีเหยียบค้างใต้รูปแป้น และ dialog ยังคงคำแนะนำเลือก/ทำงานใน gesture strip
- ฮินต์แป้นใช้รูปสามปุ่มที่เน้นตำแหน่งจริง ไม่มีชื่อซ้าย/กลาง/ขวาที่มองเห็น ไอคอนลูกศรและหน้าที่นำสายตาแทน ชื่อแป้นยังอยู่ใน accessibility label ของรูป
- ตัวจำลองเดฟเหลือปุ่มสามแป้น ช่องฉีดคำสั่งและ STT output ซ่อนใน details ไม่แสดงตารางคำอธิบายซ้ำ มีเพียงชุดเดียวใน dialog บนสุด/หน้าหลัก ทั้ง toggle และ panel เป็น fixed overlay ห้ามกัน padding หรือเปลี่ยนขนาด/ตำแหน่งเนื้อหาและ dialog เมื่อเปิด

## จุดแก้ไขและตรวจ

| ไฟล์ | หน้าที่ |
| --- | --- |
| src/components/examination-workflow.tsx | รายการ action ของแต่ละหน้า, rail, dialogs, บัฟเฟอร์แก้ไข |
| src/hooks/use-examination-focus.ts | allowlist data-pedal-target เฉพาะ active root |
| src/lib/examination-controls.ts | context, คีย์, timing, binding |
| src/lib/examination-gestures.ts | controller เดียวทุกอุปกรณ์ |
| src/hooks/use-examination-voice.ts | lifecycle และปลายทาง STT/audio |
| src/components/examination-dev-tools.tsx | ตัวจำลองชั่วคราว |
| src/components/examination-mic-status.tsx | ไฟไมค์ 4 สถานะและคำแนะนำค้างพูด |
| src/app/portal/examinations/station.css | layout/typography ใหม่แทน CSS สะสม UI1.x |

`npm run typecheck`, `npm run lint -- <changed paths>`, `npm run test:examinations` เป็น non-interactive ดูผล browser จริงและข้อจำกัดใน examinations-qa.md ไม่อ้างว่า STT/hardware จริงหรือ production build ผ่านจาก unit tests

## Patient context layout (7 November 2026)

- Removed the examination-only branding header; the shared portal header remains. Pointer help is at bottom right, beside the development overlay; existing bounded pedal help actions remain available.
- Record/review uses a left patient-context card and a narrower central report. At >=1700px a third column remains empty for a future panel; below that, both existing cards use the available width. Mobile stacks the cards. Patient details and report scroll independently.
- Context displays the selected request's patient identity, separate request/examination/specimen identifiers, specimen and procedure, clinical information, referring hospital/doctor, collection and additional requirements. Empty fields say ไม่ระบุ. Prior reports are explicitly unavailable until a history API is connected; never derive history from other fixtures or current report Parts.
- Context and corner help do not join the pedal target cycle. Preserve the distinct synthetic examination accession and specimen accession until their API semantics are agreed.

## Compact workstation refinement (7 November 2026)

- The central transcript is capped at 720px wide and 520px high on desktop (short viewports reduce its height). It remains scrollable; dictation, auto-follow and review behavior are unchanged.
- Context uses a 400–420px desktop card, two columns for short fields and full-width rows for clinical prose/specimen descriptions. Referring hospital/doctor appears immediately after identifiers. Card values use 1rem, labels .875rem, report text 1.125rem, report title 1.375rem and station hints 1rem at the default portal preset. This supersedes the earlier 22px content/18px hint requirement for the main workstation; preserve rem scaling and accessibility labels.
- Reduce vertical gaps/padding and rail button height to show more patient information without changing the bounded pedal actions. Shared portal preferences and other modules retain their existing typography.

## Shared biopsy reference template — 8 November 2026

- Each Part A–E represents a separate specimen, not a different clinical report section. All Parts use the same biopsy reference text. Existing per-Part transcript/audio IDs and draft contents are preserved; rendered headings ignore the legacy clinical-section titles retained in old saved drafts.
- `ExaminationSpecimenTemplate` appears once on the right during record/review; its heading follows the selected Part. The image-supplied blank template was transcribed with slash-separated alternatives and measurement/submission blanks, including Surgical number, container count and the Biopsy note. No specimen values are automatically filled and the reference is never appended to dictated text.
- Part A alone may contain the case's report; additional Parts are available for separately examined specimens. Empty Parts do not require dictation. Do not infer the Part count from bag/container count or assume every Part must be used.
- The reference is read-only and excluded from bounded pedal targets. It scrolls independently. At <=1100px it follows the other cards; otherwise it occupies the third column. These are provisional placement rules; final card proportions are pending user review.

## Three-column reading hierarchy — 8 November 2026

- Display only Part A–E in report headings; the Biopsy reference has no Part designation and does not change with Part selection. Existing saved content, IDs and audio remain intact.
- The central report is the largest card. Desktop columns are compact patient context (280–320px), remaining width for the report, and shared Biopsy (300–420px). All three are aligned at the top with the same viewport-bounded height. This supersedes the earlier fixed 720×520 report cap and provisional third-column rules. Below 1100px Biopsy follows the first two cards; mobile stacks all cards.
- Biopsy and Surgical number share the card header. Six ordered sections guide dictation: containers, receipt/quantity, appearance, measurements, sampling and submission. Plain text is the sentence scaffold; pale indigo chips are alternatives/optional phrases, dotted blanks are values to dictate. These chips are read-only reference text, not controls or selected/completed states.
- Stable data-template-section and data-template-choice attributes identify speech-coverage destinations for future implementation. No keyword matching or completed-state display exists yet; coverage must be tracked per Part when introduced, while the reference wording stays shared. Preserve every source alternative and unit.
- Removed the source form note “(มากกว่า 1 ขวด)” from the Biopsy header at the user’s request; it carries no instruction needed by this interface.
- Patient context omits empty optional rows and entire empty optional groups, so labels without values do not consume scanning space. If all clinical-information fields are absent, show one explicit absence message; retain the distinct unavailable prior-history message.

## Focused examination shell — 8 November 2026

- `/portal/examinations` omits the shared portal header entirely: no branding, language/font controls or sign-out in this workstation. Do not move them into an extra footer row. Portal preferences remain active and can be changed from the portal home page.
- Home and help are pointer controls in the unused left/right areas of the existing command rail, vertically centered relative to that rail. They do not join the bounded pedal target cycle. Preserve the exact left-double-tap back instruction beneath the central pedal controls; home navigation is a separate action.
- Home waits for a pending/unsaved hydrated report to save, blocks during voice/loading, and stays on the page if saving fails. It never confirms or finalizes a report. Keep explicit context back and home navigation distinct.
- On desktop, flex/grid allocate the remaining viewport height to the three cards, without a fixed header-height deduction or extra footer. On narrow screens the cards stack/scroll normally.

## Reversible fixture reset — 8 November 2026

Development-only simulator has a collapsed selected-case data section with reset and restore controls, excluded from foot selection. Reset waits for in-flight saves and cancels pending autosave; the selected request's stored draft is backed up and removed in one IndexedDB transaction. Restore uses the same backup. Other requests are untouched. This does not change OCR/review eligibility or confirm a report.

## Stable lookup and detailed fixture 0038 — 8 November 2026

- Standby and case use the same symmetric three-column lookup grid on desktop. The search occupies the central column before and after lookup; selected-request details appear only in the left column using the same `ExaminationCaseContext` as record/review. Readiness and failed-search slots reserve fixed space so feedback does not move the form. Do not recenter the form around the combined width of search plus card.
- The left card scrolls independently and contains all populated request details. Pre-record lookup does not display a draft-save footer, because lookup itself is not a saved report. At <=1100px the search remains in a fixed first row and the details follow below for available width.
- Fixture 0038 now has entirely authored clinical history, a long referring-doctor note, radiographic findings, specimen collection details, clinical suspicion and appointment information. It remains a fictional request, visibly identified by `isMock`; none of these values were extracted from a real patient document or written into the examination transcript.
- `pathology.referralNote` is an optional frontend draft field, rendered and edited as multiline text; it is not a claim that the pending OCR/backend contract provides that property. Keep the long fixture in `request-demo-0038.ts` so its chronology and narrative can be maintained together. Do not infer Parts from its single container.

- Desktop lookup context fills the entire left grid track; do not cap it at 400px or align a narrow card against the search. Keep only the normal 32px page gutter and 24px inter-column gap while preserving the centered search position.

## Font preference control restored — 8 November 2026

The shared Aa 90/100/120% control is available in the unused lower-right area of the existing examination rail. It adds no header/footer row and does not move home/help or join pedal selection. It uses the same versioned preference as the portal header. The simulator's invisible wrapper is pointer-transparent; only its visible toggle/panel receives pointer events. Mobile separates the Aa control from the home/help row.

## Reading hierarchy, type and breathing room — 8 November 2026

- Desktop record/review uses 28/44/28 columns with 28px space above/below the cards and 24px between columns. Recording caps the transcript at 480px and keeps it internally scrollable; review uses available height. Shared Aa scaling remains active. Default body sizes: clinical context 16px/1.7, reference 15px/1.75, transcript 18px/1.65, labels 14px, patient name 20px and report title 22px.
- Patient identity and examination accession remain in the card header. Referring-doctor note and clinical history now precede specimen/imaging information. Request identifiers, origin and collection details remain available in the trailing native details section. No clinical prose was summarized or removed. Save status belongs in the transcript heading, not patient metadata.
- Biopsy alternatives retain stable data identifiers but appear as lightly highlighted words/phrases separated by slash marks, without button-like borders. Keep each option phrase together during line wrapping. Speech-coverage matching remains future work; no completed state is inferred.
- A new case shows Part A. Completing it with a fresh 3-second hold/release saves completion and opens the next Part. Manual add-Part controls are removed. Part adjustment cycles unlocked/populated Parts only. A-E backing slots remain intact; legacy text/audio is always visible.
- Optional `ExaminationDraft.visiblePartIds` persists explicitly enabled empty Parts while keeping version 2 backwards compatible. Loading, undo and review must not discard or hide saved text/audio in later Parts. Review/confirmation shows enabled/populated Parts, including empty Parts explicitly added by the user. Adding Parts is disabled after confirmation. The strip and report remain outside pedal selection.

## Capture feedback and Part completion — 8 November 2026

- Recording header: right-facing speaker (64px), full-width signed time-domain waveform, accumulated/live mm:ss. Removed visible title/logo/save label/line count. Green means MediaRecorder has actually started, amber means opening/processing, gray means off. Wave shape comes from 160 signed time-domain samples via AnalyserNode, with elapsed-time smoothing and a quadratic SVG path; silence remains flat. No speaker monitoring or microphone auto-start.
- Record rail: current Part, hold-to-save Part, review/send, Tools. Latest-line editing moved into Tools. A completion target uses right hold without speech; center hold retains contextual speech. Right short release navigates normally without saving; pointer, Enter/Space, simulator and hardware use the same 3000ms release threshold and progress bar.
- Save completion before marking a Part complete or opening its successor. A failed write retains the current Part and error/retry. Request/Part/context changes and blur cancel pending gestures. completedPartIds is optional v2 metadata; editing or appending audio revokes completion for that Part.
- Completing A opens B; an untouched B does not need recording/completion. Review and final identity summary include only populated Parts. A report with no populated Parts cannot submit. Every populated Part must be completed. Existing later-Part data stays accessible for compatibility.
- Review opens the existing local-lock confirmation dialog. Final confirmation also requires a fresh 3-second right hold/release. It does not submit to a hospital backend or sign clinically; the dialog retains this consequence explicitly.

## Separate speech/save pedals and color identity — 8 November 2026

- Center hold remains push-to-talk on every selected target. Completion and confirmation move to the right pedal, held 3000ms then released on the corresponding selected target. Right short release still selects the next available control; cancellation saves nothing. Pointer/Enter/Space on the explicit hold buttons binds to the right pedal. Hold progress, cue pictograms and help use this mapping.
- Microphone waveform expands into all available space between the speaker and timer. A 2048-sample analyser supplies a signed 160-point curve, interpolated over time and drawn with smooth quadratic segments at up to display-frame rate. Reduced-motion preference limits updates to 10fps. There are no synthetic oscillations and no monitoring through speakers.
- Small pictogram highlight: left orange #c45c13, center blue #2563eb, right purple #9333ea. Only the indicated key uses its highlightColor; both inactive keys retain original gray #bdccc3. Original key geometry/background remain. Hardware illustration and simulator surfaces retain their original appearance; no whole-pedal color overlays.
