"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import WorkspaceHeader from "./workspace-header";
import PortalIcon from "./portal-icon";
import ExaminationStepper from "./examination-stepper";
import ExaminationPlayer from "./examination-player";
import { blankParts, examinationRequests, formatDuration, readyForRecording, shortTime, type ExaminationPart, type ExaminationRequest } from "@/lib/examination-data";

type RecordingStatus = "idle" | "starting" | "recording" | "paused" | "stopped";
type StoredDraft = { version: 1; requestId: string; parts: ExaminationPart[]; duration: number; confirmed: boolean; savedAt: string };
const records = examinationRequests();

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function Status({ value }: { value: string }) {
  const tone = ["พร้อมใช้งาน", "สแกนแล้ว", "ยืนยันแล้ว"].includes(value) ? "green" : value === "ต้องแก้ไข" ? "red" : "orange";
  return <span className={`intake-badge status-${tone}`}>{value}</span>;
}

export default function ExaminationWorkflow() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<ExaminationRequest | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [ocr, setOcr] = useState("");
  const [descending, setDescending] = useState(true);
  const [parts, setParts] = useState(blankParts);
  const [partId, setPartId] = useState("A");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [past, setPast] = useState<ExaminationPart[][]>([]);
  const [future, setFuture] = useState<ExaminationPart[][]>([]);
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [seekRevision, setSeekRevision] = useState(0);
  const [modal, setModal] = useState<"confirm" | "restart" | "change" | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const elapsedBefore = useRef(0);
  const mounted = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const part = parts.find(item => item.id === partId) ?? parts[0];
  const busy = status === "recording" || status === "paused" || status === "starting";
  const hasText = parts.some(item => item.lines.some(line => line.text.trim()));
  const filtered = records.filter(record => (!category || record.category === category) && (!ocr || record.ocr === ocr) && `${record.id} ${record.sender} ${record.hn} ${record.category}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)) * (descending ? 1 : -1));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== "inactive") recorder.current.stop(); }
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => setElapsed(elapsedBefore.current + Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  function goTo(next: number) {
    if (busy) { setError("กรุณาสิ้นสุดการบันทึกก่อนเปลี่ยนขั้นตอน"); return; }
    setError(""); setNotice(""); setStep(next); setFind(""); setReplaceOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function selectRequest(record: ExaminationRequest) {
    if (!readyForRecording(record)) return;
    if (selected?.id === record.id) return;
    if (selected && (hasText || audioUrl)) {
      setNotice("กรุณาบันทึกฉบับร่างก่อนเปลี่ยนใบคำร้อง");
      return;
    }
    setSelected(record); setParts(blankParts()); setPartId("A"); setText(""); setElapsed(0); setStatus("idle"); setConfirmed(false); setAudioUrl(""); setPast([]); setFuture([]); setNotice(""); setError("");
    try {
      const saved = JSON.parse(sessionStorage.getItem(`pathology:exam:${record.id}`) ?? "null") as StoredDraft | null;
      if (saved?.version === 1 && saved.requestId === record.id && Array.isArray(saved.parts) && saved.parts.length === 5 && saved.parts.every((item, index) => item.id === "ABCDE"[index] && Array.isArray(item.lines) && item.lines.every(line => typeof line.id === "string" && typeof line.text === "string" && Number.isFinite(line.time) && line.time >= 0))) {
        setParts(saved.parts); setElapsed(Number.isFinite(saved.duration) ? saved.duration : 0); setConfirmed(Boolean(saved.confirmed)); setNotice("เปิดข้อมูลที่บันทึกไว้แล้ว");
      }
    } catch { setNotice("ไม่สามารถเปิดฉบับร่างได้"); }
  }

  function updateParts(next: ExaminationPart[]) {
    if (confirmed) return;
    setPast(current => [...current.slice(-49), parts]); setFuture([]); setParts(next); setNotice("");
  }

  function addText() {
    if (!text.trim()) return;
    const lines = text.trim().split(/\n+/).filter(Boolean).map((value, index) => ({ id: `${Date.now()}-${index}`, time: elapsed, text: value.trim() }));
    updateParts(parts.map(item => item.id === partId ? { ...item, lines: [...item.lines, ...lines] } : item));
    setText("");
  }

  async function startRecording() {
    if (confirmed || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง"); return; }
    setError(""); setNotice(""); setStatus("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const nextRecorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      nextRecorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      nextRecorder.onstop = () => {
        media.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        const blob = new Blob(chunks.current, { type: nextRecorder.mimeType });
        if (blob.size) setAudioUrl(URL.createObjectURL(blob));
        setStatus("stopped");
      };
      nextRecorder.onerror = () => { media.getTracks().forEach(track => track.stop()); if (mounted.current) { setStatus("idle"); setError("การบันทึกเสียงขัดข้อง กรุณาลองใหม่"); } };
      recorder.current = nextRecorder;
      elapsedBefore.current = 0; startedAt.current = Date.now(); setElapsed(0); setAudioUrl("");
      nextRecorder.start(1000); setStatus("recording");
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) { setStatus("idle"); setError("ไม่สามารถเปิดไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์"); }
    }
  }

  function togglePause() {
    if (status === "recording" && recorder.current?.state === "recording") {
      recorder.current.pause(); elapsedBefore.current = elapsedBefore.current + Math.floor((Date.now() - startedAt.current) / 1000); setElapsed(elapsedBefore.current); setStatus("paused");
    } else if (status === "paused" && recorder.current?.state === "paused") {
      recorder.current.resume(); startedAt.current = Date.now(); setStatus("recording");
    }
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") {
      if (status === "recording") setElapsed(elapsedBefore.current + Math.floor((Date.now() - startedAt.current) / 1000));
      recorder.current.stop();
    }
  }

  function save(confirmation = false) {
    if (!selected) return false;
    try {
      const payload: StoredDraft = { version: 1, requestId: selected.id, parts, duration: elapsed, confirmed: confirmation || confirmed, savedAt: new Date().toISOString() };
      sessionStorage.setItem(`pathology:exam:${selected.id}`, JSON.stringify(payload));
      setNotice(confirmation ? "ยืนยันและบันทึกผลการตรวจแล้ว" : "บันทึกฉบับร่างแล้ว");
      if (confirmation) setConfirmed(true);
      return true;
    } catch { setError("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่"); return false; }
  }

  function showModal(value: "confirm" | "restart" | "change") { setModal(value); dialog.current?.showModal(); }
  function undo() { const previous = past.at(-1); if (previous) { setFuture(current => [parts, ...current]); setParts(previous); setPast(current => current.slice(0, -1)); } }
  function redo() { const next = future[0]; if (next) { setPast(current => [...current, parts]); setParts(next); setFuture(current => current.slice(1)); } }
  function replaceAll() {
    if (!find || confirmed) return;
    updateParts(parts.map(item => item.id === partId ? { ...item, lines: item.lines.map(line => ({ ...line, text: line.text.split(find).join(replacement) })) } : item));
    setReplaceOpen(false); setFind(""); setNotice("แทนที่ข้อความแล้ว");
  }

  return <div className="intake-shell exam-shell min-h-svh text-[#123269]">
    <WorkspaceHeader />
    <main className="intake-main exam-main min-h-[calc(100svh-84px)] px-5 pb-8 sm:px-8 xl:px-[4.15%]">
      <nav aria-label="เส้นทางหน้า" className="intake-breadcrumb flex items-center gap-3"><Link href="/portal" className="flex items-center gap-2 text-[#607da4] hover:text-blue-700"><PortalIcon name="home" />หน้าแรก</Link><PortalIcon name="chevron" className="size-3 text-[#8da2be]" /><span aria-current="page" className="font-semibold">บันทึกผลการตรวจ</span></nav>
      <ExaminationStepper step={step} onBack={goTo} />
      {(notice || error) && <p role={error ? "alert" : "status"} className={`exam-notice ${error ? "error" : ""}`}>{error || notice}</p>}

      {step === 1 && <div className="exam-selection-grid">
        <section className="intake-panel exam-selection" aria-labelledby="selected-heading"><h2 id="selected-heading" className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>เอกสารที่เลือก</h2>
          <div className="exam-selected-card"><div className={`exam-document ${selected ? "has-document" : ""}`}><PortalIcon name="file" className="size-14" /><p>{selected ? selected.id : "ยังไม่ได้เลือกเอกสาร"}</p>{selected && <span className="intake-caption text-[#7d90ad]">{selected.fileName}</span>}</div><dl className="exam-selected-details">{[
            { icon: "file" as const, label: "เลขคำร้อง", value: selected?.id },
            { icon: "users" as const, label: "ผู้ส่งตรวจ", value: selected?.sender },
            { icon: "file" as const, label: "ประเภทคำร้อง", value: selected?.category },
            { icon: "calendar" as const, label: "วันที่อัปโหลด", value: selected ? dateLabel(selected.uploadedAt) : "" },
            { icon: "scan" as const, label: "สถานะ OCR", value: selected?.ocr },
          ].map(item => <div key={item.label}><dt><PortalIcon name={item.icon} className="size-[18px]" />{item.label}</dt><dd>{item.value || "—"}</dd></div>)}</dl></div>
          <button type="button" className="intake-button intake-button-primary exam-next w-full" disabled={!selected || !readyForRecording(selected)} onClick={() => goTo(2)}><PortalIcon name="arrow" />ไปขั้นตอนถัดไป</button>
        </section>
        <section className="intake-panel min-w-0" aria-labelledby="ready-heading"><div className="exam-panel-header"><h2 id="ready-heading" className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>รายการคำร้องที่พร้อมใช้งาน</h2><button type="button" className="intake-button intake-refresh" onClick={() => setNotice("อัปเดตรายการแล้ว")}><PortalIcon name="refresh" />รีเฟรชข้อมูล</button></div>
          <div className="exam-request-filters"><div className="intake-search"><PortalIcon name="search" className="size-4 text-[#6383b2]" /><input aria-label="ค้นหาคำร้องสำหรับบันทึกผล" placeholder="ค้นหาเลขคำร้อง / ชื่อ / ประเภท..." value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="ประเภทคำร้อง" className="intake-select" value={category} onChange={event => setCategory(event.target.value)}><option value="">ทุกประเภท</option>{["คำร้องทั่วไป", "ขอใช้บริการ", "ส่งตรวจ"].map(value => <option key={value}>{value}</option>)}</select><select aria-label="สถานะ OCR" className="intake-select" value={ocr} onChange={event => setOcr(event.target.value)}><option value="">ทุกสถานะ OCR</option>{["สแกนแล้ว", "กำลังดำเนินงาน", "ไม่สามารถสแกนได้"].map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="overflow-x-auto"><table className="intake-table exam-requests-table w-full text-left"><thead><tr><th>เลขคำร้อง</th><th>ประเภท</th><th>ผู้ส่งตรวจ</th><th><button type="button" onClick={() => setDescending(!descending)}>วันที่อัปโหลด ↕</button></th><th>สถานะ OCR</th><th>สถานะ</th><th>เลือก</th></tr></thead><tbody>{filtered.map(record => <tr key={record.id} className={selected?.id === record.id ? "intake-selected" : ""}><td className="whitespace-nowrap">{record.id}</td><td className="whitespace-nowrap">{record.category}</td><td className="whitespace-nowrap">{record.sender}</td><td className="whitespace-nowrap"><span className="block">{dateLabel(record.uploadedAt)}</span><span className="intake-caption text-[#8596b0]">{new Date(record.uploadedAt).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.</span></td><td><Status value={record.ocr} /></td><td><Status value={record.review} /></td><td><div className="flex items-center gap-3"><input type="radio" name="exam-request" aria-label={`เลือกคำร้อง ${record.id}`} checked={selected?.id === record.id} disabled={!readyForRecording(record)} onChange={() => selectRequest(record)} /><button type="button" className="intake-row-button" disabled={!readyForRecording(record)} onClick={() => selectRequest(record)}>เลือก</button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="py-12! text-center text-[#8393aa]">ไม่พบใบคำร้อง</td></tr>}</tbody></table></div><div className="mt-4 flex items-center justify-between"><p className="intake-caption text-[#8193ad]">แสดง {filtered.length ? "1" : "0"} - {filtered.length} จาก {filtered.length} รายการ</p><span className="intake-page current" aria-label="หน้าปัจจุบัน 1">1</span></div>
        </section>
      </div>}

      {step > 1 && selected && <>
        <section className="intake-panel exam-case-strip" aria-label="ข้อมูลคำร้อง"><div><span>เลขคำร้อง</span><strong>{selected.id}</strong></div><div><span>HN</span><strong>{selected.hn}</strong></div><div><span>เลขการตรวจ</span><strong>{selected.accession}</strong></div><div><span>{step === 3 ? "ระยะเวลาการบันทึก" : "ประเภท"}</span><strong>{step === 3 ? formatDuration(elapsed) : selected.category}</strong></div><div><span>สถานะปัจจุบัน</span><Status value={confirmed ? "ยืนยันแล้ว" : "พร้อมใช้งาน"} /></div>{step === 2 && <button type="button" className="intake-button" disabled={busy} onClick={() => hasText || audioUrl ? showModal("change") : goTo(1)}><PortalIcon name="swap" />เปลี่ยนใบคำร้อง</button>}</section>

        {step === 2 && <div className="exam-record-grid">
          <section className="intake-panel exam-recorder"><h2 className="intake-heading">สถานะการบันทึก</h2><div className={`exam-mic ${status === "recording" ? "recording" : ""}`}><PortalIcon name="microphone" /></div><p className={`exam-record-label ${status === "recording" ? "recording" : ""}`}>{status === "recording" ? "กำลังบันทึกผลการตรวจ" : status === "paused" ? "พักการบันทึกชั่วคราว" : status === "stopped" ? "บันทึกเสียงเสร็จแล้ว" : status === "starting" ? "กำลังเปิดไมโครโฟน" : "พร้อมบันทึกผลการตรวจ"}</p><p className="exam-timer" aria-label="ระยะเวลาบันทึก">{formatDuration(elapsed)}</p>
            <div className="exam-foot-switch"><svg viewBox="0 0 60 42" fill="none" aria-hidden="true"><path d="m6 31 12-25 35 7-12 25L6 31Z" fill="#8593a4" /><path d="m6 31 35 7 12-25v7L41 42 6 35v-4Z" fill="#627487" /><path d="m21 12 23 5m-25 0 22 5m-25 0 22 5" stroke="#d8e1e9" strokeWidth="2" /></svg><div><p>สวิตช์เท้า (Foot Switch)</p><span><i />ยังไม่เชื่อมต่อ</span></div></div>
            <div className="exam-record-actions">{status === "idle" || status === "stopped" ? <button type="button" className="intake-button exam-record-start" disabled={confirmed} onClick={() => status === "stopped" ? showModal("restart") : void startRecording()}><PortalIcon name="microphone" />{status === "stopped" ? "บันทึกใหม่" : "เริ่มบันทึกเสียง"}</button> : <><button type="button" disabled={status === "starting"} className="intake-button" onClick={togglePause}><PortalIcon name={status === "paused" ? "play" : "pause"} />{status === "paused" ? "บันทึกต่อ" : "พักชั่วคราว"}</button><button type="button" disabled={status === "starting"} className="intake-button exam-record-stop" onClick={stopRecording}><PortalIcon name="stop" />สิ้นสุดการบันทึก</button></>}</div>
            {audioUrl && <div className="mt-5"><ExaminationPlayer url={audioUrl} durationHint={elapsed} /></div>}
          </section>
          <div className="exam-record-content"><section className="intake-panel exam-transcription"><div className="exam-panel-header"><h2 className="intake-heading">ข้อความถอดเสียง</h2><span className="exam-live-status"><i className={status === "recording" ? "live" : ""} />{status === "recording" ? "กำลังบันทึกเสียง" : "Part " + partId}</span></div><div className="exam-part-tabs" role="tablist" aria-label="ส่วนของผลตรวจ">{parts.map(item => <button type="button" role="tab" aria-selected={partId === item.id} aria-controls="transcription-panel" id={`part-tab-${item.id}`} key={item.id} onClick={() => { setPartId(item.id); setText(""); }}>Part {item.id}</button>)}</div><div id="transcription-panel" role="tabpanel" aria-labelledby={`part-tab-${partId}`} className="exam-transcript-lines">{part.lines.length ? part.lines.map(line => <div key={line.id}><time>{shortTime(line.time)}</time><p>{line.text}</p></div>) : <div className="exam-empty"><PortalIcon name="file" className="size-10" /><p>ยังไม่มีข้อความถอดเสียง</p></div>}</div><div className="exam-manual-entry"><textarea aria-label={`เพิ่มข้อความ Part ${partId}`} disabled={confirmed} value={text} onChange={event => setText(event.target.value)} placeholder="เพิ่มข้อความ..." rows={2} /><button type="button" disabled={!text.trim() || confirmed} className="intake-button" onClick={addText}>เพิ่มข้อความ</button></div></section><div className="intake-panel exam-next-bar"><span>ขั้นตอนถัดไป: ตรวจสอบและยืนยัน</span><button type="button" className="intake-button intake-button-primary" disabled={busy || (!hasText && !audioUrl)} onClick={() => goTo(3)}>ถัดไป<PortalIcon name="arrow" /></button></div></div>
        </div>}

        {step === 3 && <><div className="exam-review-grid"><aside className="intake-panel exam-parts-sidebar"><h2 className="intake-heading"><span className="intake-heading-icon"><PortalIcon name="file" /></span>ส่วนของเนื้อหา</h2><nav aria-label="ส่วนของเนื้อหา" className="exam-part-list">{parts.map(item => <button type="button" key={item.id} aria-current={partId === item.id ? "true" : undefined} onClick={() => { setPartId(item.id); setFind(""); setReplaceOpen(false); }}><span className="exam-part-file"><PortalIcon name="file" /></span><span className="flex-1"><strong>Part {item.id} &nbsp; {item.title}</strong><span>{item.lines.length ? `${shortTime(item.lines[0].time)} - ${shortTime(item.lines.at(-1)?.time ?? 0)}` : "—"}<span>{item.lines.length} บรรทัด</span></span></span></button>)}</nav></aside>
          <section className="intake-panel exam-editor min-w-0" aria-labelledby="part-heading"><div className="exam-editor-heading"><div><h2 id="part-heading" className="intake-heading">Part {partId} &nbsp; {part.title}</h2><p className="intake-caption mt-1 text-[#8092ad]">จำนวน {part.lines.length} บรรทัด</p></div><ExaminationPlayer key={`${audioUrl}-${seekRevision}`} url={audioUrl} durationHint={elapsed} seekTime={seekRevision > 0 ? seekTime : undefined} /></div><div className="exam-editor-tools"><div className="intake-search"><PortalIcon name="search" className="size-4" /><input aria-label="ค้นหาข้อความในส่วนนี้" placeholder="ค้นหาข้อความในส่วนนี้..." value={find} onChange={event => setFind(event.target.value)} /></div><button type="button" className="intake-button" aria-label="ย้อนการแก้ไข" disabled={!past.length || confirmed} onClick={undo}><PortalIcon name="undo" /></button><button type="button" className="intake-button" aria-label="ทำซ้ำการแก้ไข" disabled={!future.length || confirmed} onClick={redo}><PortalIcon name="redo" /></button><button type="button" className="intake-button" disabled={confirmed} onClick={() => setReplaceOpen(!replaceOpen)}><PortalIcon name="refresh" />แทนที่ทั้งหมด</button></div>{replaceOpen && <div className="exam-replace"><input aria-label="ข้อความที่ต้องการแทนที่" placeholder="ค้นหาคำ..." value={find} onChange={event => setFind(event.target.value)} /><input aria-label="แทนที่ด้วย" placeholder="แทนที่ด้วย..." value={replacement} onChange={event => setReplacement(event.target.value)} /><button type="button" disabled={!find} onClick={replaceAll} className="intake-button">แทนที่</button></div>}
            <div className="exam-lines-table"><div className="exam-line-table-heading"><span>เวลา</span><span>ข้อความที่ถอดจากเสียง (สามารถแก้ไขได้)</span><span /></div>{part.lines.filter(line => !find || line.text.includes(find)).map(line => <div className="exam-edit-line" key={line.id}><button type="button" aria-label={`ฟังเสียงที่ ${shortTime(line.time)}`} disabled={!audioUrl} onClick={() => { setSeekTime(line.time); setSeekRevision(value => value + 1); }}>{shortTime(line.time)}</button><input aria-label={`ข้อความ Part ${partId} ${shortTime(line.time)} ${line.id}`} readOnly={confirmed} value={line.text} onChange={event => updateParts(parts.map(item => item.id === partId ? { ...item, lines: item.lines.map(value => value.id === line.id ? { ...value, text: event.target.value } : value) } : item))} /><button type="button" aria-label={`ลบข้อความ ${line.id}`} className="portal-icon-button" disabled={confirmed} onClick={() => updateParts(parts.map(item => item.id === partId ? { ...item, lines: item.lines.filter(value => value.id !== line.id) } : item))}><PortalIcon name="close" className="size-4" /></button></div>)}{!part.lines.filter(line => !find || line.text.includes(find)).length && <div className="exam-empty"><PortalIcon name="file" className="size-9" /><p>{find ? "ไม่พบข้อความ" : "ยังไม่มีข้อความในส่วนนี้"}</p></div>}</div>
          </section></div><footer className="intake-panel exam-review-footer"><button type="button" className="intake-button" onClick={() => goTo(2)}><PortalIcon name="arrow" className="rotate-180" />ย้อนกลับ</button><div><button type="button" className="intake-button" disabled={confirmed} onClick={() => save()}><PortalIcon name="save" />บันทึกฉบับร่าง</button><button type="button" className="intake-button intake-button-primary" disabled={confirmed || !hasText || parts.some(item => item.lines.some(line => !line.text.trim()))} onClick={() => showModal("confirm")}><PortalIcon name="check" />{confirmed ? "ยืนยันแล้ว" : "ยืนยันและบันทึก"}</button></div></footer></>}
      </>}
    </main>
    <dialog ref={dialog} aria-labelledby="exam-dialog-title" className="exam-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="exam-panel-header"><h2 id="exam-dialog-title" className="intake-heading">{modal === "confirm" ? "ยืนยันผลการตรวจ" : modal === "change" ? "เปลี่ยนใบคำร้อง" : "เริ่มบันทึกใหม่"}</h2><button type="button" className="portal-icon-button" aria-label="ปิดหน้าต่าง" onClick={() => dialog.current?.close()}><PortalIcon name="close" /></button></div><p>{modal === "confirm" ? `ยืนยันผลการตรวจ ${selected?.id} หลังยืนยันจะไม่สามารถแก้ไขได้` : modal === "change" ? "บันทึกฉบับร่างก่อนเปลี่ยนใบคำร้อง?" : "เสียงเดิมจะถูกล้าง ข้อความที่บันทึกไว้จะยังคงอยู่"}</p><div className="exam-dialog-actions"><button type="button" className="intake-button" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="button" className="intake-button intake-button-primary" onClick={() => { if (modal === "confirm") { if (save(true)) dialog.current?.close(); } else if (modal === "change") { if (save()) { setSelected(null); setParts(blankParts()); setAudioUrl(""); setElapsed(0); setStatus("idle"); setConfirmed(false); setStep(1); dialog.current?.close(); } } else { dialog.current?.close(); void startRecording(); } }}>{modal === "change" ? "บันทึกและเปลี่ยน" : "ยืนยัน"}</button></div></dialog>
  </div>;
}
