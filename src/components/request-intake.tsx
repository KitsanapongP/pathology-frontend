"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import WorkspaceHeader from './workspace-header';
import RequestOcrDetails from './request-ocr-details';
import PortalIcon from './portal-icon';
import { initialRequests, type RequestRecord, type ReviewStatus } from '@/lib/request-data';
import { examinationOptions, type PathologyFields } from '@/lib/ocr-result';
import { emptyRequestFilters, matchesRequest, receivedDate, type RequestFilters } from '@/lib/request-filters';

const reviews: ReviewStatus[] = ['รอตรวจสอบ', 'พร้อมใช้งาน', 'ต้องแก้ไข', 'รอผล OCR'];
const ocrStatuses = ['สแกนแล้ว', 'กำลังดำเนินงาน', 'ไม่สามารถสแกนได้', 'รอประมวลผล'];
function displayDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return { date: '—', time: '' };
  const options = { timeZone: 'Asia/Bangkok' };
  return { date: new Intl.DateTimeFormat('th-TH', { ...options, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)),
    time: new Intl.DateTimeFormat('th-TH', { ...options, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) };
}
function Badge({ text }: { text: string }) {
  const tone = ['สแกนแล้ว', 'พร้อมใช้งาน'].includes(text) ? 'green' : ['ต้องแก้ไข', 'ไม่สามารถสแกนได้'].includes(text) ? 'red' : text === 'รอตรวจสอบ' ? 'orange' : 'slate';
  return <span className={`intake-badge status-${tone}`}>{text}</span>;
}

// A backend connector may supply snapshots once its response contract is agreed.
// No folder scanning, OCR parsing or DB writes happen in this component.
export type RequestSnapshot = { records: RequestRecord[]; updatedAt: string };
export default function RequestIntake({ loadRecords }: { loadRecords?: (signal: AbortSignal) => Promise<RequestSnapshot> }) {
  const [records, setRecords] = useState<RequestRecord[]>(() => loadRecords ? [] : initialRequests());
  const [filters, setFilters] = useState<RequestFilters>(emptyRequestFilters);
  const [sort, setSort] = useState('newest');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [advanced, setAdvanced] = useState(false);
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
  const updated = displayDate(updatedAt);
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

  return <div className="intake-shell request-directory min-h-svh text-[#123269]"><WorkspaceHeader/>
    <main className="intake-main request-main min-h-[calc(100svh-84px)] px-5 pb-8 sm:px-8">
      <nav className="intake-breadcrumb flex items-center gap-3" aria-label="เส้นทางหน้า"><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home"/>หน้าแรก</Link><PortalIcon name="chevron" className="size-3"/><span aria-current="page">รับใบส่งตรวจ</span></nav>
      <section className="intake-panel request-list" aria-labelledby="requests-heading">
        <header className="request-list-header"><div className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file"/></span><div><h1 id="requests-heading">รายการใบส่งตรวจ</h1><p className="request-subtitle">ทั้งหมด {records.length} รายการ</p></div></div><div className="request-refresh"><button type="button" disabled={loading} className="intake-button" onClick={()=> { if (loadRecords) setRefresh(old => old + 1); else setNotice('ไม่มีรายการใหม่ในข้อมูลปัจจุบัน'); }}><PortalIcon name="refresh" className={loading ? 'animate-spin' : ''}/>{loading ? 'กำลังโหลด' : 'รีเฟรชข้อมูล'}</button><span>อัปเดตล่าสุด {updated.date} {updated.time} น.</span></div></header>
        <div className="request-summary" aria-label="สรุปสถานะใบส่งตรวจ">{[
          { label: 'ทั้งหมด', value: '', tone: 'blue' }, { label: 'รอตรวจสอบ', value: 'รอตรวจสอบ', tone: 'orange' },
          { label: 'ต้องแก้ไข', value: 'ต้องแก้ไข', tone: 'red' }, { label: 'พร้อมใช้งาน', value: 'พร้อมใช้งาน', tone: 'green' },
        ].map(stat => <button type="button" key={stat.label} aria-pressed={filters.review===stat.value} onClick={()=>filter('review',stat.value)} className={`request-summary-card summary-${stat.tone}`}><span><i/>{stat.label}</span><strong>{records.filter(r => !stat.value || r.review===stat.value).length}<small>รายการ</small></strong></button>)}</div>
        <div className="request-search-grid"><label className="request-search-box"><PortalIcon name="search"/><input aria-label="ค้นหาใบส่งตรวจ" placeholder="เลขที่สิ่งส่งตรวจ, ชื่อ-สกุล, HN, AN…" value={filters.search} onChange={e=>filter('search',e.target.value)}/>{filters.search && <button type="button" aria-label="ล้างคำค้น" onClick={()=>filter('search','')}><PortalIcon name="close" className="size-4"/></button>}</label>
          <select className="intake-select" aria-label="ค้นหาใน" value={filters.scope} onChange={e=>filter('scope',e.target.value)}><option value="all">ค้นหาทุกฟิลด์</option><option value="accession">เลขที่สิ่งส่งตรวจ</option><option value="patient">ชื่อ-สกุล</option><option value="hn">HN</option><option value="an">AN</option></select>
          <select className="intake-select" aria-label="Ward / OPD" value={filters.ward} onChange={e=>filter('ward',e.target.value)}><option value="">ทุก Ward / OPD</option>{wards.map(v=><option key={v}>{v}</option>)}</select>
          <select className="intake-select" aria-label="ส่งตรวจ" value={filters.test} onChange={e=>filter('test',e.target.value)}><option value="">ทุกรายการส่งตรวจ</option>{examinationOptions.map(v=><option key={v}>{v}</option>)}</select>
        </div>
        <div className="request-filter-toolbar"><div><button type="button" className={`intake-button ${advanced ? 'request-filter-open' : ''}`} aria-expanded={advanced} aria-controls="request-more-filters" onClick={()=>setAdvanced(!advanced)}><PortalIcon name="settings" className="size-4"/>ตัวกรองเพิ่มเติม<PortalIcon name="chevron" className={`size-3 ${advanced ? '-rotate-90' : 'rotate-90'}`}/></button>{activeFilters>0 && <button type="button" className="request-reset" onClick={resetFilters}>ล้างตัวกรอง ({activeFilters})</button>}</div><span>พบ {filtered.length} รายการ</span></div>
        {advanced && <div className="request-advanced" id="request-more-filters"><label>วันที่รับใบส่งตรวจ · ตั้งแต่<input className="intake-select" type="date" value={filters.from} onChange={e=>filter('from',e.target.value)} max={filters.to || undefined}/></label><label>ถึงวันที่<input className="intake-select" type="date" value={filters.to} onChange={e=>filter('to',e.target.value)} min={filters.from || undefined}/></label><label>สถานะ OCR<select className="intake-select" value={filters.ocr} onChange={e=>filter('ocr',e.target.value)}><option value="">ทั้งหมด</option>{ocrStatuses.map(v=><option key={v}>{v}</option>)}</select></label><label>สถานะตรวจสอบ<select className="intake-select" value={filters.review} onChange={e=>filter('review',e.target.value)}><option value="">ทั้งหมด</option>{reviews.map(v=><option key={v}>{v}</option>)}</select></label><label>แพทย์ผู้ส่งตรวจ<select className="intake-select" value={filters.doctor} onChange={e=>filter('doctor',e.target.value)}><option value="">ทั้งหมด</option>{doctors.map(v=><option key={v}>{v}</option>)}</select></label><label>เพศ<select className="intake-select" value={filters.sex} onChange={e=>filter('sex',e.target.value)}><option value="">ทั้งหมด</option><option>ชาย</option><option>หญิง</option></select></label></div>}
        {invalidRange && <p role="alert" className="request-error">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น</p>}
        {error && <p role="alert" className="request-error">{error}</p>}{notice && <p role="status" className="request-notice">{notice}</p>}
        <div className="request-table-tools"><span>{activeFilters ? 'รายการตามเงื่อนไขที่เลือก' : 'รายการล่าสุด'}</span><label>เรียงตาม<select aria-label="เรียงใบส่งตรวจ" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="newest">วันที่รับ · ใหม่ไปเก่า</option><option value="oldest">วันที่รับ · เก่าไปใหม่</option><option value="accession">เลขที่สิ่งส่งตรวจ</option><option value="name">ชื่อ-สกุล</option></select></label></div>
        <div className="request-table-scroll"><table className="intake-table request-table w-full text-left"><thead><tr><th>เลขที่สิ่งส่งตรวจ</th><th>ชื่อ-สกุล</th><th>HN / AN</th><th>Ward / OPD</th><th>ส่งตรวจ</th><th>วันที่รับใบส่งตรวจ</th><th>สถานะ OCR</th><th>สถานะตรวจสอบ</th><th>จัดการ</th></tr></thead><tbody>{visible.map(record=>{const date=displayDate(receivedDate(record));return <tr key={record.id} onClick={()=>openRecord(record,false)}><td><button className="request-accession" aria-label={`ดู ${record.id}`} onClick={e=>{e.stopPropagation();openRecord(record,false);}}>{record.pathology?.accessionNumber || 'รอเลขที่สิ่งส่งตรวจ'}</button><small>{record.id}</small></td><td><span className="request-patient">{record.patientName || 'รอข้อมูลผู้ป่วย'}</span><small>{[record.pathology?.age, record.pathology?.sex].filter(Boolean).join(' · ') || '—'}</small></td><td><span>{record.hn || '—'}</span><small>AN: {record.pathology?.an || '—'}</small></td><td>{record.pathology?.ward || '—'}</td><td><div className="request-tests">{record.pathology?.tests?.length ? record.pathology.tests.map(test=><span key={test}>{test}</span>) : '—'}</div></td><td>{date.date}<small>{date.time} น.</small></td><td><Badge text={record.ocr}/></td><td><Badge text={record.review}/></td><td><div className="flex gap-2"><button type="button" className="intake-row-button" aria-label={`รายละเอียด ${record.id}`} onClick={e=>{e.stopPropagation();openRecord(record,false);}}><PortalIcon name="eye"/>ดู</button><button type="button" className="intake-row-button" aria-label={`แก้ไข ${record.id}`} onClick={e=>{e.stopPropagation();openRecord(record,true);}}><PortalIcon name="edit"/>แก้ไข</button></div></td></tr>;})}</tbody></table>{!visible.length && <div className="request-empty"><PortalIcon name="search" className="size-9"/><h2>ไม่พบใบส่งตรวจ</h2><p>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>{activeFilters>0 && <button className="intake-button" onClick={resetFilters}>ล้างตัวกรอง</button>}</div>}</div>
        <footer className="request-pagination"><span>{filtered.length ? (currentPage-1)*pageSize+1 : 0}–{Math.min(currentPage*pageSize,filtered.length)} จาก {filtered.length} รายการ</span><div><label>แสดง<select aria-label="จำนวนใบส่งตรวจต่อหน้า" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option value={n} key={n}>{n} รายการ</option>)}</select></label><nav aria-label="หน้าใบส่งตรวจ"><button className="intake-page" disabled={currentPage===1} aria-label="หน้าก่อนหน้า" onClick={()=>setPage(currentPage-1)}><PortalIcon name="chevron" className="size-3 rotate-180"/></button>{Array.from({length:pages},(_,i)=>i+1).map(n=><button key={n} className={`intake-page ${n===currentPage?'current':''}`} aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}>{n}</button>)}<button className="intake-page" disabled={currentPage===pages} aria-label="หน้าถัดไป" onClick={()=>setPage(currentPage+1)}><PortalIcon name="chevron" className="size-3"/></button></nav></div></footer>
      </section>
      <details className="request-manual"><summary><PortalIcon name="upload" className="size-4"/>อัปโหลดด้วยตนเอง<PortalIcon name="chevron" className="size-3 rotate-90"/></summary><div className="request-manual-body">
        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" ref={fileInput} className="sr-only" aria-label="เลือกไฟล์ใบส่งตรวจ" onChange={e=>{addFiles(Array.from(e.target.files ?? []));e.target.value='';}}/>
        <div className={`request-dropzone ${dragging ? 'is-dragging' : ''}`} onDragEnter={e=>{e.preventDefault();dragDepth.current++;setDragging(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();if(--dragDepth.current===0)setDragging(false);}} onDrop={dropFiles}><PortalIcon name="upload" className="size-7"/><button type="button" onClick={()=>fileInput.current?.click()}>เลือกไฟล์ หรือลากไฟล์มาวางที่นี่</button><span>PDF / JPG / PNG · ไม่เกิน 10 MB ต่อไฟล์</span></div>
        {!!files.length && <ul className="request-upload-files">{files.map((file,i)=><li key={`${file.name}-${i}`}><span>{file.name}</span><button aria-label={`ลบไฟล์ ${i+1}`} onClick={()=>setFiles(old=>old.filter((_,j)=>i!==j))}><PortalIcon name="close" className="size-4"/></button></li>)}</ul>}
        {uploadError && <p role="alert" className="request-error">{uploadError}</p>}<div className="request-manual-actions"><button className="intake-button" onClick={()=>{setFiles([]);setUploadError('');}}><PortalIcon name="refresh"/>ล้างไฟล์</button><button className="intake-button intake-button-primary" onClick={upload}><PortalIcon name="upload"/>เพิ่มเอกสาร</button></div>
      </div></details>
    </main>
    <dialog ref={dialog} aria-labelledby="request-dialog-heading" onClose={()=>setPreviewUrl('')} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="request-detail-dialog intake-dialog"><header><div><h2 id="request-dialog-heading">{editing ? 'ตรวจสอบและแก้ไขใบส่งตรวจ' : 'รายละเอียดใบส่งตรวจ'}</h2><p>{active?.pathology?.accessionNumber || active?.id}</p></div><button className="portal-icon-button" aria-label="ปิดหน้าต่าง" onClick={()=>dialog.current?.close()}><PortalIcon name="close"/></button></header>
      {active && (editing ? <form onSubmit={save}><div className="request-field-grid"><label className="intake-edit-label">ชื่อ-สกุล<input className="intake-select" value={draft.patientName} onChange={e=>setDraft({...draft,patientName:e.target.value})}/></label><label className="intake-edit-label">HN<input className="intake-select" value={draft.hn} onChange={e=>setDraft({...draft,hn:e.target.value})}/></label><label className="intake-edit-label">สถานะตรวจสอบ<select className="intake-select" value={draft.review} onChange={e=>setDraft({...draft,review:e.target.value as ReviewStatus})}>{reviews.map(v=><option key={v}>{v}</option>)}</select></label><div><dt>สถานะ OCR</dt><dd><Badge text={active.ocr}/></dd></div></div><RequestOcrDetails key={active.id} result={active.ocrResult} fields={draft.pathology} onChange={pathology=>setDraft({...draft,pathology})}/>{editError && <p role="alert" className="request-error">{editError}</p>}<footer><button type="button" className="intake-button" onClick={()=>dialog.current?.close()}>ยกเลิก</button><button type="submit" className="intake-button intake-button-primary"><PortalIcon name="check"/>บันทึกการตรวจสอบ</button></footer></form> : <div className="request-detail-body"><dl className="request-field-grid"><div><dt>ชื่อ-สกุล</dt><dd>{active.patientName || '—'}</dd></div><div><dt>HN</dt><dd>{active.hn || '—'}</dd></div><div><dt>สถานะ OCR</dt><dd><Badge text={active.ocr}/></dd></div><div><dt>สถานะตรวจสอบ</dt><dd><Badge text={active.review}/></dd></div></dl><RequestOcrDetails key={active.id} result={active.ocrResult} fields={active.pathology ?? {}}/>{previewUrl && <details className="request-raw-ocr"><summary>เอกสารใบส่งตรวจ</summary>{active.file?.type==='application/pdf' || active.fileName.toLowerCase().endsWith('.pdf') ? <iframe title="เอกสารใบส่งตรวจ" src={previewUrl} className="mt-4 h-[500px] w-full"/> : <Image unoptimized src={previewUrl} alt="เอกสารใบส่งตรวจ" width={1200} height={1600} className="mt-4 h-auto w-full object-contain"/>}</details>}<footer><button className="intake-button intake-button-primary" onClick={()=>setEditing(true)}><PortalIcon name="edit"/>ตรวจสอบและแก้ไข</button></footer></div>)}
    </dialog>
  </div>;
}
