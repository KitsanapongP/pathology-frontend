"use client";

import Link from "next/link";
import Image from "next/image";
import { publicAsset } from "@/lib/public-asset";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import WorkspaceHeader from "./workspace-header";
import PortalIcon, { type PortalIconName } from "./portal-icon";
import { initialRequests, requestTemplates, type RequestRecord, type ReviewStatus } from "@/lib/request-data";

const pageSize = 8;
const categories = ["คำร้องทั่วไป", "ขอใช้บริการ", "ส่งตรวจ"];
const reviewStatuses: ReviewStatus[] = ["รอตรวจสอบ", "พร้อมใช้งาน", "ต้องแก้ไข", "รอผล OCR"];

function dateParts(date: string) {
  const value = new Date(date);
  return {
    date: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).format(value),
    time: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(value),
  };
}

function badgeTone(text: string) {
  if (["สแกนแล้ว", "พร้อมใช้งาน", "ขอใช้บริการ"].includes(text)) return "green";
  if (["รอตรวจสอบ", "ส่งตรวจ"].includes(text)) return "orange";
  if (["ต้องแก้ไข", "ไม่สามารถสแกนได้"].includes(text)) return "red";
  if (["รอประมวลผล", "รอผล OCR"].includes(text)) return "slate";
  return "blue";
}

export default function RequestIntake() {
  const [records, setRecords] = useState(initialRequests);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [ocr, setOcr] = useState("");
  const [review, setReview] = useState("");
  const [page, setPage] = useState(1);
  const [descending, setDescending] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [updatedAt, setUpdatedAt] = useState("2026-10-16T10:24:00+07:00");
  const [active, setActive] = useState<RequestRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [draft, setDraft] = useState({ sender: "", category: categories[0], hn: "", patientName: "", review: "รอตรวจสอบ" as ReviewStatus });
  const [editError, setEditError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const filtered = records.filter(record =>
    (!category || record.category === category) && (!ocr || record.ocr === ocr) && (!review || record.review === review) &&
    `${record.id} ${record.sender} ${record.fileName} ${record.hn} ${record.patientName}`.toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => (Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)) * (descending ? 1 : -1));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const updated = dateParts(updatedAt);
  const latestDay = new Date(updatedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  function addFiles(incoming: File[]) {
    const invalid = incoming.find(file => !/\.(pdf|jpe?g|png)$/i.test(file.name) || (file.type && !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) || file.size === 0 || file.size > 10 * 1024 * 1024);
    if (invalid) {
      setError(`${invalid.name}: กรุณาใช้ไฟล์ PDF / JPG / PNG ขนาดไม่เกิน 10 MB`);
      setNotice("");
      return;
    }
    setFiles(current => [...current, ...incoming.filter(file => !current.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified))]);
    setError("");
    setNotice("");
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function upload() {
    if (!files.length) { setError("กรุณาเลือกไฟล์ก่อนอัปโหลด"); return; }
    const now = new Date().toISOString();
    const nextNumber = Math.max(...records.map(record => Number(record.id.split("-").at(-1)))) + 1;
    const additions = files.map((file, i): RequestRecord => ({
      id: `REQ-2569-${String(nextNumber + i).padStart(4, "0")}`,
      category: "คำร้องทั่วไป", sender: "ผู้ใช้งาน", fileName: file.name, hn: "", patientName: "", uploadedAt: now,
      ocr: "รอประมวลผล", review: "รอผล OCR", file,
    }));
    setRecords(current => [...additions, ...current]);
    setFiles([]);
    if (fileInput.current) fileInput.current.value = "";
    setSearch(""); setCategory(""); setOcr(""); setReview(""); setPage(1); setDescending(true);
    setUpdatedAt(now);
    setError("");
    setNotice(`เพิ่มใบคำร้อง ${additions.length} รายการแล้ว`);
  }

  function openRecord(record: RequestRecord, edit: boolean) {
    setActive(record);
    setEditing(edit);
    setEditError("");
    setDraft({ sender: record.sender, category: record.category, hn: record.hn, patientName: record.patientName, review: record.review });
    setPreviewUrl(record.file ? URL.createObjectURL(record.file) : "");
    dialog.current?.showModal();
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    if (draft.review === "พร้อมใช้งาน" && active.ocr !== "สแกนแล้ว") { setEditError("กรุณารอผล OCR ก่อนยืนยันข้อมูล"); return; }
    setRecords(current => current.map(record => record.id === active.id ? { ...record, ...draft, sender: draft.sender.trim(), hn: draft.hn.trim(), patientName: draft.patientName.trim() } : record));
    dialog.current?.close();
    setNotice("บันทึกข้อมูลแล้ว");
  }

  const stats: { label: string; value: number; icon: PortalIconName; tone: string }[] = [
    { label: "เอกสารวันนี้", value: records.filter(r => new Date(r.uploadedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) === latestDay).length, icon: "file", tone: "blue" },
    { label: "รอตรวจสอบ", value: records.filter(r => r.review === "รอตรวจสอบ").length, icon: "clock", tone: "orange" },
    { label: "สแกนแล้ว", value: records.filter(r => r.ocr === "สแกนแล้ว").length, icon: "checkCircle", tone: "green" },
    { label: "ทั้งหมด", value: records.length, icon: "file", tone: "purple" },
  ];

  return <div className="intake-shell min-h-svh text-[#123269]">
    <WorkspaceHeader />
    <main className="intake-main min-h-[calc(100svh-84px)] px-5 pb-8 sm:px-8 xl:px-[4.15%]">
      <nav aria-label="เส้นทางหน้า" className="intake-breadcrumb flex items-center gap-3 text-sm"><Link href="/portal" className="flex items-center gap-2 text-[#607da4] hover:text-blue-700"><PortalIcon name="home" className="size-5 text-[#0e397c]" />หน้าแรก</Link><PortalIcon name="chevron" className="size-3 text-[#8da2be]" /><span aria-current="page" className="font-semibold">รับใบคำร้อง</span></nav>
      <div className="intake-layout grid items-start gap-3.5">
        <div className="grid min-w-0 gap-3.5">
          <section className="intake-panel" aria-labelledby="upload-heading">
            <h1 id="upload-heading" className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>อัปโหลดใบคำร้อง</h1>
            <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="sr-only" aria-label="เลือกไฟล์ใบคำร้อง" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            <div className={`intake-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={event => { event.preventDefault(); dragDepth.current += 1; setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current === 0) setDragging(false); }} onDrop={dropFiles}>
              <PortalIcon name="upload" className="mb-4 size-12 text-[#0873ff]" />
              <p className="text-center text-lg font-semibold text-[#10336c]">ลากไฟล์มาวางที่นี่ หรือ<button type="button" onClick={() => fileInput.current?.click()} className="ml-1 text-[#0668ed] hover:underline">เลือกไฟล์</button></p>
              <p className="mt-2 text-center text-sm leading-6 text-[#7a90b0]">รองรับไฟล์ PDF / JPG / PNG<br />ขนาดไฟล์ไม่เกิน 10 MB ต่อไฟล์</p>
            </div>
            {files.length > 0 && <ul className="intake-file-list mt-3 space-y-1.5">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-md bg-[#f1f6ff] px-3 py-2 text-xs"><PortalIcon name="file" className="size-4 text-blue-600" /><span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span><span className="text-[#8a9cb5]">{(file.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" aria-label={`ลบไฟล์ ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => index !== i))}><PortalIcon name="close" className="size-4" /></button></li>)}</ul>}
            <div className="intake-upload-actions mt-4 flex gap-2"><button type="button" className="intake-button" onClick={() => fileInput.current?.click()}><PortalIcon name="folder" className="size-[18px]" />เลือกไฟล์</button><button type="button" onClick={upload} className="intake-button intake-button-primary flex-1"><PortalIcon name="scan" className="size-[18px]" />อัปโหลดและสแกน OCR</button><button type="button" className="intake-button" onClick={() => { setFiles([]); setError(""); setNotice(""); if (fileInput.current) fileInput.current.value = ""; }}><PortalIcon name="refresh" className="size-[18px]" />ล้างไฟล์</button></div>
            {error && <p role="alert" className="mt-3 text-xs leading-5 text-red-600">{error}</p>}
            {notice && <p role="status" className="mt-3 text-xs leading-5 text-[#07805a]">{notice}</p>}
          </section>

          <section className="intake-panel intake-templates" aria-labelledby="templates-heading"><h2 id="templates-heading" className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>ดาวน์โหลดแบบฟอร์มคำร้อง</h2><ul className="mt-4 space-y-2">{requestTemplates.map(template => <li key={template.file} className="flex min-h-[52px] items-center gap-3 rounded-lg border border-[#e5edf7] px-2.5 py-1.5"><span className={`intake-template-icon status-${template.color}`}><PortalIcon name="file" className="size-[22px]" /></span><span className="min-w-0 flex-1 text-sm">{template.title}</span><a href={publicAsset(`/forms/${template.file}.html`)} download={`${template.title}.html`} className="intake-button intake-download"><PortalIcon name="download" className="size-4" />ดาวน์โหลด</a></li>)}</ul></section>
        </div>

        <section className="intake-panel intake-results min-w-0" aria-labelledby="requests-heading">
          <div className="mb-4 flex items-start justify-between gap-3"><h2 id="requests-heading" className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>รายการใบคำร้องทั้งหมด</h2><div className="shrink-0 text-right"><button type="button" onClick={() => { setUpdatedAt(new Date().toISOString()); setNotice(""); }} className="intake-button intake-refresh"><PortalIcon name="refresh" className="size-4" />รีเฟรชข้อมูล</button><p className="mt-2 intake-caption text-[#8397b5]">อัปเดตล่าสุด {updated.date} {updated.time} น.</p></div></div>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(stat => <div key={stat.label} className={`intake-stat stat-${stat.tone}`}><span className="intake-stat-symbol"><PortalIcon name={stat.icon} className="size-7" /></span><div><p className="text-xs font-medium text-[#254378]">{stat.label}</p><p className="mt-1 text-[27px] font-semibold leading-8">{stat.value}<span className="ml-3 text-xs font-normal text-[#8296b4]">รายการ</span></p></div></div>)}</div>
          <div className="intake-filters mb-4 grid gap-2.5"><div className="intake-search"><PortalIcon name="search" className="size-4 text-[#6383b2]" /><input aria-label="ค้นหาใบคำร้อง" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="ค้นหาเลขคำร้อง, ผู้ส่ง หรือชื่อเอกสาร..." /></div><select aria-label="ประเภทคำร้อง" className="intake-select" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">ทุกประเภท</option>{categories.map(value => <option key={value}>{value}</option>)}</select><select aria-label="สถานะ OCR" className="intake-select" value={ocr} onChange={event => { setOcr(event.target.value); setPage(1); }}><option value="">ทุกสถานะ OCR</option>{["สแกนแล้ว", "กำลังดำเนินงาน", "ไม่สามารถสแกนได้", "รอประมวลผล"].map(value => <option key={value}>{value}</option>)}</select><select aria-label="สถานะตรวจสอบ" className="intake-select" value={review} onChange={event => { setReview(event.target.value); setPage(1); }}><option value="">ทุกสถานะตรวจสอบ</option>{reviewStatuses.map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="overflow-x-auto"><table className="intake-table w-full text-left"><thead><tr><th>เลขคำร้อง</th><th>ประเภท</th><th>ผู้ส่ง</th><th><button type="button" onClick={() => setDescending(!descending)} className="flex items-center gap-1" aria-label={descending ? "เรียงวันที่เก่าไปใหม่" : "เรียงวันที่ใหม่ไปเก่า"}>วันที่อัปโหลด<span aria-hidden="true" className="text-blue-600">{descending ? "↕" : "↥"}</span></button></th><th>สถานะ OCR</th><th>สถานะตรวจสอบ</th><th>จัดการ</th></tr></thead><tbody>{visible.map(record => { const uploaded = dateParts(record.uploadedAt); return <tr key={record.id} className={selectedId === record.id ? "intake-selected" : ""}><td className="whitespace-nowrap">{record.id}</td><td><span className={`intake-badge status-${badgeTone(record.category)}`}>{record.category}</span></td><td className="whitespace-nowrap">{record.sender}</td><td className="whitespace-nowrap text-[#7a8eac]"><span className="block">{uploaded.date}</span><span className="block intake-caption">{uploaded.time} น.</span></td><td><span className={`intake-badge status-${badgeTone(record.ocr)}`}>{record.ocr}</span></td><td><span className={`intake-badge status-${badgeTone(record.review)}`}>{record.review}</span></td><td><div className="flex gap-1.5"><button type="button" className="intake-row-button" onClick={() => openRecord(record, false)} aria-label={`ดู ${record.id}`}><PortalIcon name="eye" />ดู</button><button type="button" className="intake-row-button" onClick={() => openRecord(record, true)} aria-label={`แก้ไข ${record.id}`}><PortalIcon name="edit" />แก้ไข</button><button type="button" className={`intake-row-button ${selectedId === record.id ? "is-selected" : ""}`} aria-pressed={selectedId === record.id} aria-label={`เลือก ${record.id}`} onClick={() => { setSelectedId(selectedId === record.id ? "" : record.id); setNotice(""); }}><PortalIcon name="check" />{selectedId === record.id ? "เลือกแล้ว" : "เลือก"}</button></div></td></tr>; })}{visible.length === 0 && <tr><td colSpan={7} className="py-14! text-center text-[#8b9bb2]">ไม่พบใบคำร้อง</td></tr>}</tbody></table></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#8799b4]">แสดง {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filtered.length)} จาก {filtered.length} รายการ</p><nav aria-label="หน้าใบคำร้อง" className="flex gap-1"><button type="button" className="intake-page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า"><PortalIcon name="chevron" className="size-3.5 rotate-180" /></button>{Array.from({ length: pageCount }, (_, i) => i + 1).map(number => <button type="button" key={number} aria-current={currentPage === number ? "page" : undefined} className={`intake-page ${currentPage === number ? "current" : ""}`} onClick={() => setPage(number)}>{number}</button>)}<button type="button" className="intake-page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป"><PortalIcon name="chevron" className="size-3.5" /></button></nav></div>
        </section>
      </div>
    </main>

    <dialog ref={dialog} onClose={() => setPreviewUrl("")} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-labelledby="request-dialog-heading" className="intake-dialog m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-[#dde7f4] bg-white p-0 text-[#173869] shadow-2xl backdrop:bg-[#0d2f5e]/35 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#e6edf6] px-6 py-5"><h2 id="request-dialog-heading" className="text-lg font-semibold">{editing ? "แก้ไขใบคำร้อง" : "รายละเอียดใบคำร้อง"} · {active?.id}</h2><button type="button" aria-label="ปิดหน้าต่าง" onClick={() => dialog.current?.close()} className="portal-icon-button"><PortalIcon name="close" /></button></div>
      {editing ? <form onSubmit={saveRecord} className="p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="intake-edit-label">ประเภท<select className="intake-select" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label className="intake-edit-label">ผู้ส่ง<input required className="intake-select" value={draft.sender} onChange={event => setDraft({ ...draft, sender: event.target.value })} /></label><label className="intake-edit-label">HN<input className="intake-select" value={draft.hn} onChange={event => setDraft({ ...draft, hn: event.target.value })} /></label><label className="intake-edit-label">ชื่อผู้ป่วย<input className="intake-select" value={draft.patientName} onChange={event => setDraft({ ...draft, patientName: event.target.value })} /></label><label className="intake-edit-label sm:col-span-2">สถานะตรวจสอบ<select className="intake-select" value={draft.review} onChange={event => setDraft({ ...draft, review: event.target.value as ReviewStatus })}>{reviewStatuses.map(value => <option key={value}>{value}</option>)}</select></label></div>{editError && <p role="alert" className="mt-3 text-sm text-red-600">{editError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" className="intake-button" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="submit" className="intake-button intake-button-primary">บันทึก</button></div></form> : <div className="p-6"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="mb-1 text-xs text-[#8b9bb2]">ประเภท</dt><dd>{active?.category}</dd></div><div><dt className="mb-1 text-xs text-[#8b9bb2]">ผู้ส่ง</dt><dd>{active?.sender}</dd></div><div><dt className="mb-1 text-xs text-[#8b9bb2]">HN</dt><dd>{active?.hn || "—"}</dd></div><div><dt className="mb-1 text-xs text-[#8b9bb2]">ชื่อผู้ป่วย</dt><dd>{active?.patientName || "—"}</dd></div><div><dt className="mb-1 text-xs text-[#8b9bb2]">สถานะ OCR</dt><dd>{active?.ocr}</dd></div><div><dt className="mb-1 text-xs text-[#8b9bb2]">สถานะตรวจสอบ</dt><dd>{active?.review}</dd></div><div className="col-span-2 min-w-0"><dt className="mb-1 text-xs text-[#8b9bb2]">ชื่อเอกสาร</dt><dd className="break-words">{active?.fileName}</dd></div></dl>{previewUrl && (active?.file?.type === "application/pdf" || active?.fileName.toLowerCase().endsWith(".pdf") ? <iframe title="เอกสารใบคำร้อง" src={previewUrl} className="mt-6 h-[450px] w-full rounded-lg border border-[#e1e9f4]" /> : <div className="mt-6 flex justify-center rounded-lg bg-[#f5f8fc] p-4"><Image unoptimized src={previewUrl} alt="เอกสารใบคำร้อง" width={1200} height={1600} className="max-h-[450px] w-auto max-w-full object-contain" /></div>)}</div>}
    </dialog>
  </div>;
}


