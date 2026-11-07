"use client";
import { PortalText, usePortalLanguage } from './portal-preferences';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import RequestOcrDetails from './request-ocr-details';
import PortalIcon from './portal-icon';
import { initialRequests, type RequestRecord, type ReviewStatus } from '@/lib/request-data';
import { examinationOptions, type PathologyFields } from '@/lib/ocr-result';
import { emptyRequestFilters, matchesRequest, receivedDate, type RequestFilters } from '@/lib/request-filters';

const reviews: ReviewStatus[] = ['รอตรวจสอบ', 'พร้อมใช้งาน', 'ต้องแก้ไข', 'รอผล OCR'];
const ocrStatuses = ['สแกนแล้ว', 'กำลังดำเนินงาน', 'ไม่สามารถสแกนได้', 'รอประมวลผล'];
function displayDate(value: string, locale = 'th-TH') {
  if (!Number.isFinite(Date.parse(value))) return { date: '—', time: '' };
  const options = { timeZone: 'Asia/Bangkok' };
  return { date: new Intl.DateTimeFormat(locale, { ...options, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)),
    time: new Intl.DateTimeFormat(locale, { ...options, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) };
}
function Badge({ text }: { text: string }) {
  const tone = ['สแกนแล้ว', 'พร้อมใช้งาน'].includes(text) ? 'green' : ['ต้องแก้ไข', 'ไม่สามารถสแกนได้'].includes(text) ? 'red' : text === 'รอตรวจสอบ' ? 'orange' : 'slate';
  return <span className={`intake-badge status-${tone}`}><PortalText>{text}</PortalText></span>;
}

// A backend connector may supply snapshots once its response contract is agreed.
// No folder scanning, OCR parsing or DB writes happen in this component.
export type RequestSnapshot = { records: RequestRecord[]; updatedAt: string };
export default function RequestIntake({ loadRecords }: { loadRecords?: (signal: AbortSignal) => Promise<RequestSnapshot> }) {
  const { t, locale } = usePortalLanguage();
  const [records, setRecords] = useState<RequestRecord[]>(() => loadRecords ? [] : initialRequests());
  const [filters, setFilters] = useState<RequestFilters>(emptyRequestFilters);
  const [sort, setSort] = useState('newest');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('2026-10-25T10:20:00+07:00');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<RequestRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [draft, setDraft] = useState({ hn: '', patientName: '', review: 'รอตรวจสอบ' as ReviewStatus, pathology: {} as PathologyFields });
  const [editError, setEditError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const uploadDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  useEffect(() => { if (previewUrl) return () => URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (!loadRecords) return;
    const controller = new AbortController();
    let pending = false;
    async function sync() {
      if (pending || controller.signal.aborted) return;
      pending = true; setLoading(true);
      try {
        const snapshot = await loadRecords!(controller.signal);
        if (!controller.signal.aborted) { setRecords(snapshot.records); setUpdatedAt(snapshot.updatedAt); setError(''); }
      } catch { if (!controller.signal.aborted) setError('โหลดข้อมูลใบส่งตรวจไม่สำเร็จ กรุณาลองอีกครั้ง'); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    }
    void sync();
    const interval = setInterval(() => void sync(), 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [loadRecords, refresh]);

  function filter<K extends keyof RequestFilters>(key: K, value: RequestFilters[K]) { setFilters(old => ({ ...old, [key]: value })); setPage(1); }
  function resetFilters() { setFilters(emptyRequestFilters); setPage(1); }
  const filtered = records.filter(record => matchesRequest(record, filters)).sort((a, b) => sort === 'name' ? a.patientName.localeCompare(b.patientName, 'th') : sort === 'accession' ? (a.pathology?.accessionNumber ?? a.id).localeCompare(b.pathology?.accessionNumber ?? b.id, 'en', { numeric: true }) : (Date.parse(receivedDate(b)) - Date.parse(receivedDate(a))) * (sort === 'oldest' ? -1 : 1));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const wards = [...new Set(records.map(r => r.pathology?.ward).filter((v): v is string => Boolean(v)))].sort();
  const doctors = [...new Set(records.map(r => r.pathology?.requestingDoctor).filter((v): v is string => Boolean(v)))].sort();
  const activeFilters = Object.entries(filters).filter(([key, value]) => value && key !== 'scope').length;
  const updated = displayDate(updatedAt, locale);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  function addFiles(incoming: File[]) {
    const invalid = incoming.find(file => !/\.(pdf|jpe?g|png)$/i.test(file.name) || (file.type && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) || !file.size || file.size > 10 * 1024 * 1024);
    if (invalid) { setUploadError('รองรับไฟล์ PDF / JPG / PNG ขนาดไม่เกิน 10 MB ต่อไฟล์'); return; }
    setFiles(old => [...old, ...incoming.filter(file => !old.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified))]);
    setUploadError(''); setNotice('');
  }
  function dropFiles(event: DragEvent<HTMLDivElement>) { event.preventDefault(); dragDepth.current = 0; setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }
  function upload() {
    if (!files.length) { setUploadError('กรุณาเลือกไฟล์'); return; }
    const now = new Date().toISOString();
    const next = Math.max(0, ...records.map(r => Number(r.id.split('-').at(-1)) || 0)) + 1;
    setRecords(old => [...files.map((file, i): RequestRecord => ({ id: `REQ-2569-${String(next + i).padStart(4, '0')}`, category: 'ส่งตรวจ', sender: 'ผู้ใช้งาน', fileName: file.name, hn: '', patientName: '', uploadedAt: now, receivedAt: now, ocr: 'รอประมวลผล', review: 'รอผล OCR', file })), ...old]);
    setFiles([]); resetFilters(); setSort('newest'); setUploadError(''); setNotice(`เพิ่มเอกสาร ${files.length} รายการในหน้านี้แล้ว`);
    if (fileInput.current) fileInput.current.value = '';
    uploadDialog.current?.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openRecord(record: RequestRecord, edit: boolean) {
    setActive(record); setEditing(edit); setEditError('');
    setDraft({ hn: record.hn, patientName: record.patientName, review: record.review, pathology: { ...record.pathology } });
    setPreviewUrl(record.file ? URL.createObjectURL(record.file) : ''); dialog.current?.showModal();
  }
  function save(event: FormEvent) {
    event.preventDefault(); if (!active) return;
    const latest = records.find(r => r.id === active.id);
    if (!latest || (loadRecords && JSON.stringify(latest) !== JSON.stringify(active))) { setEditError('รายการนี้มีการอัปเดต กรุณาปิดแล้วเปิดตรวจสอบข้อมูลล่าสุด'); return; }
    if (draft.review === 'พร้อมใช้งาน' && (active.ocr !== 'สแกนแล้ว' || !draft.hn.trim() || !draft.patientName.trim() || !draft.pathology.accessionNumber?.trim())) { setEditError('ตรวจสอบผล OCR, HN, ชื่อ-สกุล และเลขที่สิ่งส่งตรวจก่อนยืนยัน'); return; }
    setRecords(old => old.map(r => r.id === active.id ? { ...r, ...draft, hn: draft.hn.trim(), patientName: draft.patientName.trim() } : r));
    setNotice('บันทึกข้อมูลแล้ว'); dialog.current?.close();
  }

  return <div className="intake-shell request-directory min-h-svh text-[#123269]">
    <main className="intake-main request-main min-h-[calc(100svh-84px)] px-5 pb-8 sm:px-8">
      <nav className="intake-breadcrumb flex items-center gap-3" aria-label={t("เส้นทางหน้า")}><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home"/><PortalText>หน้าแรก</PortalText></Link><PortalIcon name="chevron" className="size-3"/><span aria-current="page"><PortalText>รับใบส่งตรวจ</PortalText></span></nav>
      <section className="intake-panel request-list" aria-labelledby="requests-heading">
        <header className="request-list-header"><div className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file"/></span><div><h1 id="requests-heading"><PortalText>รายการใบส่งตรวจ</PortalText></h1><p className="request-subtitle"><PortalText>ทั้งหมด </PortalText><PortalText>{records.length}</PortalText><PortalText> รายการ</PortalText></p></div></div><div className="request-refresh"><div className="request-header-actions"><button type="button" className="intake-button" onClick={()=>{setUploadError('');uploadDialog.current?.showModal();}}><PortalIcon name="upload"/><PortalText>อัปโหลดด้วยตนเอง</PortalText></button><button type="button" disabled={loading} className="intake-button" onClick={()=> { if (loadRecords) setRefresh(old => old + 1); else setNotice('ไม่มีรายการใหม่ในข้อมูลปัจจุบัน'); }}><PortalIcon name="refresh" className={loading ? 'animate-spin' : ''}/><PortalText>{loading ? 'กำลังโหลด' : 'รีเฟรชข้อมูล'}</PortalText></button></div><span><PortalText>อัปเดตล่าสุด </PortalText><PortalText>{updated.date}</PortalText> <PortalText>{updated.time}</PortalText><PortalText> น.</PortalText></span></div></header>
        <div className="request-summary" aria-label={t("สรุปสถานะใบส่งตรวจ")}>{[
          { label: 'ทั้งหมด', value: '', tone: 'blue' }, { label: 'รอตรวจสอบ', value: 'รอตรวจสอบ', tone: 'orange' },
          { label: 'ต้องแก้ไข', value: 'ต้องแก้ไข', tone: 'red' }, { label: 'พร้อมใช้งาน', value: 'พร้อมใช้งาน', tone: 'green' },
        ].map(stat => <button type="button" key={stat.label} aria-pressed={filters.review===stat.value} onClick={()=>filter('review',stat.value)} className={`request-summary-card summary-${stat.tone}`}><span><i/><PortalText>{stat.label}</PortalText></span><strong><PortalText>{records.filter(r => !stat.value || r.review===stat.value).length}</PortalText><small><PortalText>รายการ</PortalText></small></strong></button>)}</div>
        <section className="request-search-panel" aria-label={t("ค้นหาใบส่งตรวจ")}>
          <div className="request-search-primary">
            <label className="request-search-field request-keyword"><span><PortalText>ค้นหาใบส่งตรวจ</PortalText></span><div className="request-search-box"><PortalIcon name="search"/><input aria-label={t("ค้นหาใบส่งตรวจ")} placeholder={t("เลขที่สิ่งส่งตรวจ, Surgical Number, ชื่อ-สกุล, HN, AN…")} value={filters.search} onChange={e=>filter('search',e.target.value)}/>{filters.search && <button type="button" aria-label={t("ล้างคำค้น")} onClick={()=>filter('search','')}><PortalIcon name="close" className="size-4"/></button>}</div></label>
            <label className="request-search-field"><span><PortalText>ค้นหาใน</PortalText></span><select className="intake-select" value={filters.scope} onChange={e=>filter('scope',e.target.value)}><option value="all"><PortalText>ค้นหาทุกฟิลด์</PortalText></option><option value="accession"><PortalText>เลขที่สิ่งส่งตรวจ</PortalText></option><option value="surgical">Surgical Number</option><option value="patient"><PortalText>ชื่อ-สกุล</PortalText></option><option value="hn">HN</option><option value="an">AN</option></select></label>
          </div>
          <div className="request-filter-grid">
            <label>Ward / OPD<select className="intake-select" value={filters.ward} onChange={e=>filter('ward',e.target.value)}><option value=""><PortalText>ทุก Ward / OPD</PortalText></option>{wards.map(v=><option key={v} value={v}><PortalText>{v}</PortalText></option>)}</select></label>
            <label><PortalText>ส่งตรวจ</PortalText><select className="intake-select" value={filters.test} onChange={e=>filter('test',e.target.value)}><option value=""><PortalText>ทุกรายการส่งตรวจ</PortalText></option>{examinationOptions.map(v=><option key={v} value={v}><PortalText>{v}</PortalText></option>)}</select></label>
            <label><PortalText>แพทย์ผู้ส่งตรวจ</PortalText><select className="intake-select" value={filters.doctor} onChange={e=>filter('doctor',e.target.value)}><option value=""><PortalText>ทั้งหมด</PortalText></option>{doctors.map(v=><option key={v} value={v}><PortalText>{v}</PortalText></option>)}</select></label>
            <label><PortalText>เพศ</PortalText><select className="intake-select" value={filters.sex} onChange={e=>filter('sex',e.target.value)}><option value=""><PortalText>ทั้งหมด</PortalText></option><option value="ชาย"><PortalText>ชาย</PortalText></option><option value="หญิง"><PortalText>หญิง</PortalText></option></select></label>
            <label><PortalText>วันที่รับใบส่งตรวจ · ตั้งแต่</PortalText><input className="intake-select" type="date" value={filters.from} onChange={e=>filter('from',e.target.value)} max={filters.to || undefined}/></label>
            <label><PortalText>ถึงวันที่</PortalText><input className="intake-select" type="date" value={filters.to} onChange={e=>filter('to',e.target.value)} min={filters.from || undefined}/></label>
            <label><PortalText>สถานะ OCR</PortalText><select className="intake-select" value={filters.ocr} onChange={e=>filter('ocr',e.target.value)}><option value=""><PortalText>ทั้งหมด</PortalText></option>{ocrStatuses.map(v=><option key={v} value={v}><PortalText>{v}</PortalText></option>)}</select></label>
            <label><PortalText>สถานะตรวจสอบ</PortalText><select className="intake-select" value={filters.review} onChange={e=>filter('review',e.target.value)}><option value=""><PortalText>ทั้งหมด</PortalText></option>{reviews.map(v=><option key={v} value={v}><PortalText>{v}</PortalText></option>)}</select></label>
          </div>
          <div className="request-filter-toolbar"><span role="status"><PortalText>พบ </PortalText><PortalText>{filtered.length}</PortalText><PortalText> รายการ</PortalText></span><button type="button" className="request-reset" disabled={!activeFilters} onClick={resetFilters}><PortalIcon name="refresh"/><PortalText>ล้างตัวกรอง</PortalText>{activeFilters>0 && <> (<PortalText>{activeFilters}</PortalText>)</>}</button></div>
        </section>
        {invalidRange && <p role="alert" className="request-error"><PortalText>วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น</PortalText></p>}
        {error && <p role="alert" className="request-error"><PortalText>{error}</PortalText></p>}{notice && <p role="status" className="request-notice"><PortalText>{notice}</PortalText></p>}
        <div className="request-table-tools"><span><PortalText>{activeFilters ? 'รายการตามเงื่อนไขที่เลือก' : 'รายการล่าสุด'}</PortalText></span><label><PortalText>เรียงตาม</PortalText><select aria-label={t("เรียงใบส่งตรวจ")} value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="newest"><PortalText>วันที่รับ · ใหม่ไปเก่า</PortalText></option><option value="oldest"><PortalText>วันที่รับ · เก่าไปใหม่</PortalText></option><option value="accession"><PortalText>เลขที่สิ่งส่งตรวจ</PortalText></option><option value="name"><PortalText>ชื่อ-สกุล</PortalText></option></select></label></div>
        <div className="request-table-scroll"><table className="intake-table request-table w-full text-left"><thead><tr><th><PortalText>เลขที่สิ่งส่งตรวจ</PortalText></th><th><PortalText>ชื่อ-สกุล</PortalText></th><th>HN / AN</th><th>Ward / OPD</th><th><PortalText>ส่งตรวจ</PortalText></th><th><PortalText>วันที่รับใบส่งตรวจ</PortalText></th><th><PortalText>สถานะตรวจสอบ</PortalText></th><th><PortalText>จัดการ</PortalText></th></tr></thead><tbody>{visible.map(record=>{const date=displayDate(receivedDate(record), locale);return <tr key={record.id} onClick={()=>openRecord(record,false)}><td><button className="request-accession" aria-label={t(`ดู ${record.id}`)} onClick={e=>{e.stopPropagation();openRecord(record,false);}}><PortalText>{record.pathology?.accessionNumber || 'รอเลขที่สิ่งส่งตรวจ'}</PortalText></button><small><PortalText>{record.id}</PortalText></small></td><td><span className="request-patient">{record.patientName || <PortalText>รอข้อมูลผู้ป่วย</PortalText>}</span><small><PortalText>{[record.pathology?.age, record.pathology?.sex].filter(Boolean).join(' · ') || '—'}</PortalText></small></td><td><span><PortalText>{record.hn || '—'}</PortalText></span><small>AN: <PortalText>{record.pathology?.an || '—'}</PortalText></small></td><td><PortalText>{record.pathology?.ward || '—'}</PortalText></td><td><div className="request-tests">{record.pathology?.tests?.length ? record.pathology.tests.map(test=><span key={test}><PortalText>{test}</PortalText></span>) : '—'}</div></td><td><PortalText>{date.date}</PortalText><small><PortalText>{date.time}</PortalText><PortalText> น.</PortalText></small></td><td><Badge text={record.review}/></td><td><div className="flex gap-2"><button type="button" className="intake-row-button" aria-label={t(`รายละเอียด ${record.id}`)} onClick={e=>{e.stopPropagation();openRecord(record,false);}}><PortalIcon name="eye"/><PortalText>ดู</PortalText></button><button type="button" className="intake-row-button" aria-label={t(`แก้ไข ${record.id}`)} onClick={e=>{e.stopPropagation();openRecord(record,true);}}><PortalIcon name="edit"/><PortalText>แก้ไข</PortalText></button></div></td></tr>;})}</tbody></table>{!visible.length && <div className="request-empty"><PortalIcon name="search" className="size-9"/><h2><PortalText>ไม่พบใบส่งตรวจ</PortalText></h2><p><PortalText>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</PortalText></p>{activeFilters>0 && <button className="intake-button" onClick={resetFilters}><PortalText>ล้างตัวกรอง</PortalText></button>}</div>}</div>
        <footer className="request-pagination"><span><PortalText>{filtered.length ? (currentPage-1)*pageSize+1 : 0}</PortalText>–<PortalText>{Math.min(currentPage*pageSize,filtered.length)}</PortalText><PortalText> จาก </PortalText><PortalText>{filtered.length}</PortalText><PortalText> รายการ</PortalText></span><div><label><PortalText>แสดง</PortalText><select aria-label={t("จำนวนใบส่งตรวจต่อหน้า")} value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option value={n} key={n}><PortalText>{n}</PortalText><PortalText> รายการ</PortalText></option>)}</select></label><nav aria-label={t("หน้าใบส่งตรวจ")}><button className="intake-page" disabled={currentPage===1} aria-label={t("หน้าก่อนหน้า")} onClick={()=>setPage(currentPage-1)}><PortalIcon name="chevron" className="size-3 rotate-180"/></button>{Array.from({length:pages},(_,i)=>i+1).map(n=><button key={n} className={`intake-page ${n===currentPage?'current':''}`} aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}><PortalText>{n}</PortalText></button>)}<button className="intake-page" disabled={currentPage===pages} aria-label={t("หน้าถัดไป")} onClick={()=>setPage(currentPage+1)}><PortalIcon name="chevron" className="size-3"/></button></nav></div></footer>
      </section>
      <dialog ref={uploadDialog} className="request-detail-dialog request-upload-dialog" aria-labelledby="request-upload-heading" onClick={e=>{if(e.target===e.currentTarget)uploadDialog.current?.close();}}><header><h2 id="request-upload-heading"><PortalText>อัปโหลดใบส่งตรวจ</PortalText></h2><button type="button" className="portal-icon-button" aria-label={t("ปิดอัปโหลด")} onClick={()=>uploadDialog.current?.close()}><PortalIcon name="close"/></button></header><div className="request-manual-body">
        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" ref={fileInput} className="sr-only" aria-label={t("เลือกไฟล์ใบส่งตรวจ")} onChange={e=>{addFiles(Array.from(e.target.files ?? []));e.target.value='';}}/>
        <div className={`request-dropzone ${dragging ? 'is-dragging' : ''}`} onDragEnter={e=>{e.preventDefault();dragDepth.current++;setDragging(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();if(--dragDepth.current===0)setDragging(false);}} onDrop={dropFiles}><PortalIcon name="upload" className="size-7"/><button type="button" onClick={()=>fileInput.current?.click()}><PortalText>เลือกไฟล์ หรือลากไฟล์มาวางที่นี่</PortalText></button><span><PortalText>PDF / JPG / PNG · ไม่เกิน 10 MB ต่อไฟล์</PortalText></span></div>
        {!!files.length && <ul className="request-upload-files">{files.map((file,i)=><li key={`${file.name}-${i}`}><span><PortalText>{file.name}</PortalText></span><button aria-label={t(`ลบไฟล์ ${i+1}`)} onClick={()=>setFiles(old=>old.filter((_,j)=>i!==j))}><PortalIcon name="close" className="size-4"/></button></li>)}</ul>}
        {uploadError && <p role="alert" className="request-error"><PortalText>{uploadError}</PortalText></p>}<div className="request-manual-actions"><button className="intake-button" onClick={()=>{setFiles([]);setUploadError('');}}><PortalIcon name="refresh"/><PortalText>ล้างไฟล์</PortalText></button><button className="intake-button intake-button-primary" onClick={upload}><PortalIcon name="upload"/><PortalText>เพิ่มเอกสาร</PortalText></button></div>
      </div></dialog>
    </main>
    <dialog ref={dialog} aria-labelledby="request-dialog-heading" onClose={()=>setPreviewUrl('')} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="request-detail-dialog intake-dialog"><header><div><h2 id="request-dialog-heading"><PortalText>{editing ? 'ตรวจสอบและแก้ไขใบส่งตรวจ' : 'รายละเอียดใบส่งตรวจ'}</PortalText></h2><p><PortalText>{active?.pathology?.accessionNumber || active?.id}</PortalText></p></div><button className="portal-icon-button" aria-label={t("ปิดหน้าต่าง")} onClick={()=>dialog.current?.close()}><PortalIcon name="close"/></button></header>
      {active && (editing ? <form onSubmit={save}><div className="request-field-grid"><label className="intake-edit-label"><PortalText>ชื่อ-สกุล</PortalText><input className="intake-select" value={draft.patientName} onChange={e=>setDraft({...draft,patientName:e.target.value})}/></label><label className="intake-edit-label">HN<input className="intake-select" value={draft.hn} onChange={e=>setDraft({...draft,hn:e.target.value})}/></label><label className="intake-edit-label"><PortalText>สถานะตรวจสอบ</PortalText><select className="intake-select" value={draft.review} onChange={e=>setDraft({...draft,review:e.target.value as ReviewStatus})}>{reviews.map(v=><option key={v} value={String(v)}><PortalText>{v}</PortalText></option>)}</select></label></div><RequestOcrDetails key={active.id} result={active.ocrResult} fields={draft.pathology} onChange={pathology=>setDraft({...draft,pathology})}/>{editError && <p role="alert" className="request-error"><PortalText>{editError}</PortalText></p>}<footer><button type="button" className="intake-button" onClick={()=>dialog.current?.close()}><PortalText>ยกเลิก</PortalText></button><button type="submit" className="intake-button intake-button-primary"><PortalIcon name="check"/><PortalText>บันทึกการตรวจสอบ</PortalText></button></footer></form> : <div className="request-detail-body"><dl className="request-field-grid"><div><dt><PortalText>ชื่อ-สกุล</PortalText></dt><dd><PortalText>{active.patientName || '—'}</PortalText></dd></div><div><dt>HN</dt><dd><PortalText>{active.hn || '—'}</PortalText></dd></div><div><dt><PortalText>สถานะตรวจสอบ</PortalText></dt><dd><Badge text={active.review}/></dd></div></dl><RequestOcrDetails key={active.id} result={active.ocrResult} fields={active.pathology ?? {}}/>{previewUrl && <details className="request-raw-ocr"><summary><PortalText>เอกสารใบส่งตรวจ</PortalText></summary>{active.file?.type==='application/pdf' || active.fileName.toLowerCase().endsWith('.pdf') ? <iframe title={t("เอกสารใบส่งตรวจ")} src={previewUrl} className="mt-4 h-[500px] w-full"/> : <Image unoptimized src={previewUrl} alt={t("เอกสารใบส่งตรวจ")} width={1200} height={1600} className="mt-4 h-auto w-full object-contain"/>}</details>}<footer><button className="intake-button intake-button-primary" onClick={()=>setEditing(true)}><PortalIcon name="edit"/><PortalText>ตรวจสอบและแก้ไข</PortalText></button></footer></div>)}
    </dialog>
  </div>;
}
