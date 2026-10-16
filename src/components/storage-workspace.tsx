"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import WorkspaceHeader from "./workspace-header";
import PortalIcon from "./portal-icon";
import StorageIllustration from "./storage-illustration";
import { storageDate, storageItems, type StoredItem } from "@/lib/storage-data";

type Filters = { search: string; status: string; returned: string; location: string; from: string; to: string };
const emptyFilters: Filters = { search: "", status: "", returned: "", location: "", from: "", to: "" };
function Badge({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) { return <span className={`storage-badge ${warning ? "warning" : ""}`}><i/>{children}</span>; }
function Heading({ title, icon = "file" }: { title: string; icon?: "file" | "search" | "folder" | "clock" }) { return <h2 className="intake-heading"><span className="intake-heading-icon"><PortalIcon name={icon}/></span>{title}</h2>; }

export default function StorageWorkspace({ kind }: { kind: StoredItem["kind"] }) {
  const tissue = kind === "tissue";
  const title = tissue ? "คลังผลบันทึกการตรวจ" : "คลังคำร้องจากถาดสไลด์";
  const key = `pathology:storage:${kind}:v1`;
  const [items, updateItems] = useReducer((_: StoredItem[], next: StoredItem[]) => next, kind, storageItems);
  const [selectedId, setSelectedId] = useState(storageItems(kind)[0].id);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<"edit" | "location" | "record" | "tray" | "loan" | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [borrower, setBorrower] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  useEffect(() => {
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (Array.isArray(raw) && raw.length === storageItems(kind).length && raw.every((row, i) => row && row.id === storageItems(kind)[i].id && row.kind === kind && ["patientName", "category", "location", "status", "recorder", "borrowedBy", "borrowedAt", "returnedAt", "storedAt"].every(field => typeof row[field] === "string") && Number.isFinite(Date.parse(row.storedAt)) && Number.isInteger(row.trays) && Number.isInteger(row.slides))) updateItems(raw);
    } catch { /* Ignore unavailable or invalid local storage. */ }
  }, [key, kind]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);

  const rows = items.filter(item => {
    const index = items.indexOf(item);
    const related = Array.from({ length: tissue ? 4 : item.trays }, (_, i) => `${tissue ? "REC" : "TRAY"}-2569-${String((tissue ? 42 : 31) + index * 8 + i).padStart(4, "0")} REQ-2569-${String((tissue ? 42 : 31) + index * 8 + i).padStart(4, "0")}`).join(" ");
    const needle = applied.search.toLocaleLowerCase();
    return (!needle || `${item.id} ${item.location} ${related} ${item.patientName}`.toLocaleLowerCase().includes(needle)) && (!applied.status || item.status === applied.status) && (!applied.returned || (item.borrowedBy && !item.returnedAt ? "ยังไม่คืน" : item.returnedAt ? "คืนแล้ว" : "ไม่มีการเบิก") === applied.returned) && (!applied.location || item.location.includes(applied.location)) && (!applied.from || item.storedAt.slice(0, 10) >= applied.from) && (!applied.to || item.storedAt.slice(0, 10) <= applied.to);
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedIndex = items.indexOf(selected);
  const onLoan = Boolean(selected.borrowedBy && !selected.returnedAt);
  function setFilter(field: keyof Filters, value: string) { setFilters(old => ({ ...old, [field]: value })); }
  function open(type: typeof modal, index = 0) { setMessage(""); setLocation(selected.location); setCategory(selected.category); setBorrower(""); setDetailIndex(index); setModal(type); }
  function save(changes: Partial<StoredItem>) {
    const next = items.map(item => item.id === selected.id ? { ...item, ...changes } : item);
    try { sessionStorage.setItem(key, JSON.stringify(next)); updateItems(next); setModal(null); setMessage("บันทึกข้อมูลแล้ว"); }
    catch { setMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์"); }
  }
  function search(event: React.FormEvent) { event.preventDefault(); if (filters.from && filters.to && filters.from > filters.to) { setMessage("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น"); return; } setApplied(filters); setPage(1); setMessage(""); }

  return <div className="workspace-shell intake-shell storage-shell min-h-svh"><WorkspaceHeader/><main className="intake-main storage-main px-5 sm:px-8">
    <nav className="intake-breadcrumb flex flex-wrap items-center gap-3" aria-label="เส้นทางหน้า"><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home"/>หน้าแรก</Link><PortalIcon name="chevron" className="size-3"/><Link href="/portal/storage">คลังข้อมูล</Link><PortalIcon name="chevron" className="size-3"/><span>{tissue ? "ผลบันทึกการตรวจ" : "คลังคำร้อง"}</span></nav>
    <h1 className="sr-only">{title}</h1>
    {message && <p className="storage-notice" role="status">{message}</p>}
    <div className="storage-grid"><section className="intake-panel storage-search-panel"><Heading title="ค้นหาข้อมูล" icon="search"/>
      <form onSubmit={search} className="storage-search-form"><label className="intake-search"><PortalIcon name="search"/><input aria-label="ค้นหาข้อมูลในคลัง" placeholder={tissue ? "ค้นหารหัสภาชนะ, เลขที่คำร้อง, ชื่อผู้ป่วย" : "ค้นหารหัสกล่อง / รหัสถาด / เลขที่คำร้อง"} value={filters.search} onChange={e=>setFilter("search", e.target.value)}/></label>
      <div className="storage-filters">
        <label className="storage-date-filter">ช่วงวันที่จัดเก็บ<div><input className="intake-select" aria-label="วันเริ่มต้น" type="date" value={filters.from} onChange={e=>setFilter("from",e.target.value)}/><span>–</span><input className="intake-select" aria-label="วันสิ้นสุด" type="date" value={filters.to} onChange={e=>setFilter("to",e.target.value)}/></div></label>
        <label>สถานะ{tissue ? "ภาชนะ" : "การจัดเก็บ"}<select className="intake-select" value={filters.status} onChange={e=>setFilter("status",e.target.value)}><option value="">ทั้งหมด</option><option>{tissue ? "จัดเก็บแล้ว" : "ครบถ้วน"}</option></select></label>
        {tissue ? <label>ตำแหน่งจัดเก็บ<select className="intake-select" value={filters.location} onChange={e=>setFilter("location",e.target.value)}><option value="">ทั้งหมด</option>{["A1","B2","C1"].map(id=><option key={id}>ตู้ {id}</option>)}</select></label> : <label>สถานะการคืน<select className="intake-select" value={filters.returned} onChange={e=>setFilter("returned",e.target.value)}><option value="">ทั้งหมด</option><option>ยังไม่คืน</option><option>คืนแล้ว</option><option>ไม่มีการเบิก</option></select></label>}
      </div><div className="storage-actions"><button className="intake-button intake-button-primary" type="submit"><PortalIcon name="search"/>ค้นหา</button><button className="intake-button" type="button" onClick={()=>{setFilters(emptyFilters);setApplied(emptyFilters);setPage(1);setMessage("");}}><PortalIcon name="refresh"/>ล้างตัวกรอง</button></div></form>
      <div className="storage-list-heading"><h2>{tissue ? `พบ ${rows.length} รายการ` : "รายการกล่องในคลัง"}</h2>{!tissue && <span>ทั้งหมด {rows.length} รายการ</span>}</div>
      <div className="storage-table-scroll"><table className="intake-table storage-table w-full"><thead><tr><th>ลำดับ</th><th>{tissue ? "รหัสภาชนะ" : "รหัสกล่อง"}</th>{tissue ? <th>ประเภท</th> : <><th>จำนวนถาด</th><th>จำนวนสไลด์</th></>}<th>วันที่จัดเก็บ</th><th>{tissue ? "ตำแหน่งจัดเก็บ" : "สถานะ"}</th><th>{tissue ? "สถานะ" : "การคืน"}</th></tr></thead><tbody>{visible.map((item,i)=><tr key={item.id} className={selected.id === item.id ? "intake-selected" : ""} onClick={()=>setSelectedId(item.id)}><td>{(currentPage-1)*pageSize+i+1}</td><td><button className="storage-code" type="button" aria-pressed={selected.id===item.id} onClick={()=>setSelectedId(item.id)}>{item.id}</button></td>{tissue ? <td>{item.category}</td> : <><td>{item.trays}</td><td>{item.slides}</td></>}<td>{storageDate(item.storedAt)}</td><td>{tissue ? item.location.split(" / ช่อง")[0] : <Badge>{item.status}</Badge>}</td><td><Badge warning={!tissue && Boolean(item.borrowedBy && !item.returnedAt)}>{tissue ? item.status : item.borrowedBy && !item.returnedAt ? "ยังไม่คืน" : item.returnedAt ? "คืนแล้ว" : "ไม่มีการเบิก"}</Badge></td></tr>)}</tbody></table>{!rows.length && <p className="storage-empty">ไม่พบข้อมูล</p>}</div>
      <div className="storage-pagination"><span>{rows.length ? `${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize,rows.length)} จาก ${rows.length} รายการ` : "0 รายการ"}</span><div><button className="intake-page" aria-label="หน้าก่อนหน้า" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><PortalIcon name="chevron" className="rotate-180 size-3"/></button><span>{currentPage} / {pages}</span><button className="intake-page" aria-label="หน้าถัดไป" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}><PortalIcon name="chevron" className="size-3"/></button><select aria-label="จำนวนรายการต่อหน้า" className="intake-select" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[8,10,20].map(n=><option key={n} value={n}>{n} รายการ</option>)}</select></div></div>
    </section>
    <section className="intake-panel storage-detail-panel" aria-label="รายละเอียดรายการที่เลือก"><div className="storage-panel-heading"><Heading title={tissue ? "รายละเอียดภาชนะที่จัดเก็บ" : "ข้อมูลกล่องที่เลือก"} icon={tissue ? "file" : "folder"}/><button className="intake-button" onClick={()=>open("edit")}><PortalIcon name="edit"/>แก้ไขข้อมูล</button></div>
      <div className="storage-summary"><div className="storage-summary-image"><StorageIllustration kind={kind}/></div><dl>
        <div><dt>{tissue ? "รหัสภาชนะ" : "รหัสกล่อง"}</dt><dd className="font-semibold">{selected.id}</dd></div>
        {tissue && <><div><dt>ประเภทภาชนะ</dt><dd>{selected.category}</dd></div><div><dt>ชื่อผู้ป่วย</dt><dd>{selected.patientName}</dd></div></>}
        <div><dt>ตำแหน่งจัดเก็บ</dt><dd>{selected.location} <button aria-label="เปิดตำแหน่งจัดเก็บ" className="storage-inline-button" onClick={()=>open("location")}><PortalIcon name="location" className="size-4"/></button></dd></div>
        {!tissue && <><div><dt>จำนวนถาด</dt><dd>{selected.trays} ถาด</dd></div><div><dt>จำนวนสไลด์</dt><dd>{selected.slides} สไลด์</dd></div></>}
        <div><dt>วันที่จัดเก็บ</dt><dd>{storageDate(selected.storedAt)}</dd></div><div><dt>ผู้บันทึกล่าสุด</dt><dd>{selected.recorder}</dd></div>{tissue && <div><dt>สถานะ</dt><dd><Badge>{selected.status}</Badge></dd></div>}
      </dl></div>
      {!tissue && <><div className="storage-subheading"><Heading title="ประวัติการเบิก – คืน" icon="clock"/><button className="intake-button" onClick={()=>open("loan")}>{onLoan ? "บันทึกการคืน" : "เบิกกล่อง"}</button></div><div className={`storage-loan ${onLoan ? "out" : ""}`}><div><span>นำออกล่าสุด</span><strong>{storageDate(selected.borrowedAt)}</strong></div><div><span>ผู้เบิก</span><strong>{selected.borrowedBy || "—"}</strong></div><div><span>สถานะการคืน</span><strong>{onLoan ? "ยังไม่คืน" : selected.returnedAt ? "คืนแล้ว" : "ไม่มีการเบิก"}</strong></div><div><span>วันที่คืน</span><strong>{storageDate(selected.returnedAt)}</strong></div></div></>}
      <div className="storage-subheading"><Heading title={tissue ? "รายการผลบันทึกการตรวจในภาชนะนี้" : "รายการถาดในกล่อง"}/><span>ทั้งหมด {tissue ? 4 : selected.trays} {tissue ? "รายการ" : "ถาด"}</span></div>
      <div className="storage-table-scroll"><table className="intake-table storage-table w-full"><thead><tr><th>ลำดับ</th><th>{tissue ? "เลขที่การตรวจ" : "รหัสถาด"}</th><th>{tissue ? "ประเภท" : "จำนวนสไลด์"}</th><th>{tissue ? "ผู้ตรวจ" : "เลขที่คำร้อง"}</th>{tissue && <th>สถานะ</th>}<th>การดำเนินการ</th></tr></thead><tbody>{Array.from({length:tissue ? 4:selected.trays},(_,i)=><tr key={i}><td>{i+1}</td><td>{tissue ? "REC" : "TRAY"}-2569-{String((tissue ? 42 : 31)+selectedIndex*8+i).padStart(4,"0")}</td><td>{tissue ? ["เคมีคลินิก","จุลชีววิทยา","โลหิตวิทยา","พยาธิวิทยา"][i] : Math.floor(selected.slides/selected.trays)+(i<selected.slides%selected.trays?1:0)}</td><td>{tissue ? ["ศุภวิชญ์ ใจดี","จิราพร มั่นคง","อนุชา พัฒนศรี","ศิริพงศ์ สอนดี"][i] : `REQ-2569-${String(31+selectedIndex*8+i).padStart(4,"0")}`}</td>{tissue && <td><Badge>เสร็จสิ้น</Badge></td>}<td><button className="intake-row-button" onClick={()=>open(tissue ? "record" : "tray",i)}><PortalIcon name="eye" className="size-4"/>ดูรายละเอียด</button></td></tr>)}</tbody></table></div>
    </section></div>
    <footer className="intake-panel storage-footer"><Link className="intake-button" href="/portal/storage"><PortalIcon name="arrow" className="rotate-180"/>ย้อนกลับ</Link><div><button className="intake-button" onClick={()=>window.print()}><PortalIcon name="printer"/>พิมพ์รายละเอียด</button><button className="intake-button intake-button-primary" onClick={()=>open("edit")}><PortalIcon name="edit"/>แก้ไขข้อมูล</button></div></footer>
    <dialog ref={dialog} aria-label="รายละเอียดคลังข้อมูล" className="matching-dialog" onCancel={()=>setModal(null)} onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="storage-panel-heading"><h2 className="intake-heading">{modal === "edit" ? "แก้ไขข้อมูลจัดเก็บ" : modal === "location" ? "ตำแหน่งจัดเก็บ" : modal === "loan" ? onLoan ? "บันทึกการคืน" : "เบิกกล่อง" : modal === "record" ? "รายละเอียดผลบันทึกการตรวจ" : "รายละเอียดถาด"}</h2><button className="portal-icon-button" aria-label="ปิดหน้าต่าง" onClick={()=>setModal(null)}><PortalIcon name="close"/></button></div>
      {modal === "edit" ? <form className="storage-edit" onSubmit={e=>{e.preventDefault();if(location.trim())save({location:location.trim(), category});}}><p>{selected.id}</p>{tissue && <label>ประเภทภาชนะ<select className="intake-select" value={category} onChange={e=>setCategory(e.target.value)}><option>ชิ้นเนื้อ</option><option>เซลล์วิทยา</option></select></label>}<label>ตำแหน่งจัดเก็บ<input required maxLength={180} className="intake-select" value={location} onChange={e=>setLocation(e.target.value)}/></label><button className="intake-button intake-button-primary" type="submit"><PortalIcon name="save"/>บันทึก</button></form> : modal === "location" ? <div className="storage-location"><PortalIcon name="location" className="size-12"/><strong>{selected.location}</strong><span>{selected.id}</span></div> : modal === "loan" ? <form className="storage-edit" onSubmit={e=>{e.preventDefault();if(onLoan)save({returnedAt:new Date().toISOString()});else if(borrower.trim())save({borrowedBy:borrower.trim(),borrowedAt:new Date().toISOString(),returnedAt:""});}}><p>{selected.id}</p>{onLoan ? <p>ผู้เบิก: {selected.borrowedBy}<br/>วันที่เบิก: {storageDate(selected.borrowedAt)}</p> : <label>ชื่อผู้เบิก<input required maxLength={100} className="intake-select" value={borrower} onChange={e=>setBorrower(e.target.value)}/></label>}<button className="intake-button intake-button-primary" type="submit">{onLoan ? "ยืนยันการคืน" : "ยืนยันการเบิก"}</button></form> : <div className="storage-record"><p>{modal === "record" ? "REC" : "TRAY"}-2569-{String((modal === "record" ? 42 : 31)+selectedIndex*8+detailIndex).padStart(4,"0")}</p><p>{tissue ? "ภาชนะ" : "กล่อง"}: {selected.id}</p>{modal === "tray" ? <><p>รายการสไลด์</p><ul>{Array.from({length:Math.floor(selected.slides/selected.trays)+(detailIndex<selected.slides%selected.trays?1:0)},(_,i)=><li key={i}>SLD-{selected.id.slice(4)}-{detailIndex+1}-{String(i+1).padStart(2,"0")}</li>)}</ul></> : <><p>ชื่อผู้ป่วย: {selected.patientName}</p><p>สถานะ: เสร็จสิ้น</p><p>วันที่ตรวจ: {storageDate(selected.storedAt)}</p><p className="text-slate-500">ยังไม่มีเนื้อหาผลการตรวจที่เชื่อมโยง</p></>}</div>}
    </dialog>
  </main></div>;
}
