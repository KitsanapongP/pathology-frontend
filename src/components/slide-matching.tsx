"use client";

import Image from "next/image";
import { publicAsset } from "@/lib/public-asset";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import WorkspaceHeader from "./workspace-header";
import PortalIcon from "./portal-icon";
import { initialMatchingState, matchingRequests, matchLabels, matchStatus, validMatchingDraft, type MatchItem, type MatchingState } from "@/lib/matching-data";

type DetectedCode = { rawValue: string; boundingBox: { x: number; y: number; width: number; height: number } };
type BarcodeDetectorConstructor = { new(options: { formats: string[] }): { detect(image: HTMLCanvasElement): Promise<DetectedCode[]> }; getSupportedFormats?: () => Promise<string[]> };
const pageSize = 10;
const storageKey = "pathology:matching-draft:v1";
const directory = new Map(initialMatchingState().items.filter(item => item.qr && item.requestId).map(item => [item.qr, item.requestId]));

function StatusBadge({ item, items }: { item: MatchItem; items: MatchItem[] }) {
  const status = matchStatus(item, items);
  return <span className={`matching-status match-${status}`}><i />{item.confirmed ? "ยืนยันแล้ว" : matchLabels[status]}</span>;
}

export default function SlideMatching() {
  const [data, dispatch] = useReducer((state: MatchingState, changes: Partial<MatchingState>) => ({ ...state, ...changes }), undefined, initialMatchingState);
  const [focusedId, setFocusedId] = useState("A4");
  const [checked, setChecked] = useState(new Set(["A4"]));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [requestSearch, setRequestSearch] = useState("");
  const [pendingRequest, setPendingRequest] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [camera, setCamera] = useState<"idle" | "starting" | "live" | "scanning">("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [modal, setModal] = useState<"zoom" | "view" | "edit" | "confirm" | null>(null);
  const [editQr, setEditQr] = useState("");
  const [editRequest, setEditRequest] = useState("");
  const [editError, setEditError] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const zoomVideo = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const focused = data.items.find(item => item.id === focusedId) ?? data.items[0] ?? null;
  const checkedItems = data.items.filter(item => checked.has(item.id) && !item.confirmed);
  const visibleItems = data.items.filter(item => (filter === "all" || (filter === "confirmed" ? item.confirmed : matchStatus(item, data.items) === filter)) && `${item.qr} ${item.requestId} ${item.position}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = visibleItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectable = visible.filter(item => !item.confirmed);
  const allChecked = selectable.length > 0 && selectable.every(item => checked.has(item.id));
  const counts = data.items.reduce((acc, item) => { const status = matchStatus(item, data.items); acc[status] += 1; return acc; }, { matched: 0, unreadable: 0, unmatched: 0, duplicate: 0 });
  const confidences = data.items.flatMap(item => item.confidence === null ? [] : [item.confidence]);
  const average = confidences.length ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) : null;
  const busy = camera === "starting" || camera === "scanning";

  useEffect(() => {
    mounted.current = true;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (validMatchingDraft(saved)) dispatch(saved);
    } catch { /* Keep the initial tray when no valid draft exists. */ }
    return () => { mounted.current = false; stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); }); };
  }, []);

  useEffect(() => {
    if (camera === "live") {
      if (video.current) video.current.srcObject = stream.current;
      if (zoomVideo.current) zoomVideo.current.srcObject = stream.current;
    }
  }, [camera, modal]);

  function focusItem(item: MatchItem, fromImage = false) {
    setFocusedId(item.id); setPendingRequest(""); setRequestSearch(""); setError("");
    if (fromImage) { setSearch(""); setFilter("all"); setPage(Math.floor(data.items.findIndex(value => value.id === item.id) / pageSize) + 1); }
  }

  function toggle(item: MatchItem) {
    if (item.confirmed) return;
    setChecked(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
    focusItem(item);
  }

  function stopCamera() {
    stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    stream.current = null;
    setCamera("idle");
  }

  async function startCamera(requestedDevice = deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) { setError("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง"); return; }
    setError(""); setNotice(""); setCamera("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: requestedDevice ? { deviceId: { exact: requestedDevice } } : { facingMode: { ideal: "environment" } }, audio: false });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
      stream.current = media;
      media.getVideoTracks().forEach(track => { track.onended = () => { if (mounted.current) { setCamera("idle"); setError("การเชื่อมต่อกล้องสิ้นสุดแล้ว"); } }; });
      const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      setDevices(list.filter(device => device.kind === "videoinput"));
      setDeviceId(media.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      dispatch({ items: [], image: "" }); setChecked(new Set()); setFocusedId(""); setCamera("live");
    } catch {
      if (mounted.current) { setCamera(stream.current?.active ? "live" : "idle"); setError("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์และการเชื่อมต่อ"); }
    }
  }

  async function scanCamera() {
    if (camera !== "live") { await startCamera(); return; }
    if (!video.current?.videoWidth || !video.current.videoHeight) { setError("กรุณารอภาพจากกล้อง"); return; }
    setCamera("scanning"); setError(""); setNotice("");
    const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setCamera("live"); setError("ไม่สามารถบันทึกภาพได้"); return; }
    context.drawImage(video.current, 0, 0);
    const image = canvas.toDataURL("image/png");
    dispatch({ image, imageWidth: canvas.width, imageHeight: canvas.height, lastScanned: new Date().toISOString(), items: [] });
    try {
      const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) throw new Error("unsupported");
      const supported = Detector.getSupportedFormats ? await Detector.getSupportedFormats() : ["qr_code"];
      const formats = ["qr_code", "data_matrix", "code_128"].filter(format => supported.includes(format));
      if (!formats.length) throw new Error("unsupported");
      const codes = await new Detector({ formats }).detect(canvas);
      if (!mounted.current) return;
      const items: MatchItem[] = codes.filter(code => code.rawValue.trim() && code.rawValue.length <= 128).map((code, index) => {
        const x = Math.max(0, Math.min(1, code.boundingBox.x / canvas.width)); const y = Math.max(0, Math.min(1, code.boundingBox.y / canvas.height));
        const width = Math.min(1 - x, Math.max(0, code.boundingBox.width / canvas.width)); const height = Math.min(1 - y, Math.max(0, code.boundingBox.height / canvas.height));
        const position = `${"ABCD"[Math.min(3, Math.floor((y + height / 2) * 4))]}${Math.min(7, Math.floor((x + width / 2) * 8)) + 1}`;
        return { id: `scan-${index}`, qr: code.rawValue.trim(), requestId: directory.get(code.rawValue.trim()) ?? "", position, kind: code.rawValue.startsWith("CAS") ? "cassette" : "slide", confidence: null, confirmed: false, bounds: { x, y, width, height } };
      });
      dispatch({ items }); setFocusedId(items[0]?.id ?? ""); setChecked(new Set()); setSearch(""); setFilter("all"); setPage(1);
      setNotice(items.length ? `พบรหัส ${items.length} รายการ` : "ไม่พบรหัสในภาพ");
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error && cause.message === "unsupported" ? "เบราว์เซอร์นี้ยังไม่รองรับการอ่านรหัสจากกล้อง" : "ไม่สามารถอ่านรหัสจากภาพได้ กรุณาสแกนอีกครั้ง");
    } finally { if (mounted.current) stopCamera(); }
  }

  function saveDraft(items = data.items) {
    if (!data.image) { setError("กรุณาสแกนภาพก่อนบันทึก"); return false; }
    try { sessionStorage.setItem(storageKey, JSON.stringify({ ...data, items })); setError(""); setNotice("บันทึกฉบับร่างแล้ว"); return true; }
    catch { setError("ไม่สามารถบันทึกฉบับร่างได้ กรุณาตรวจสอบพื้นที่จัดเก็บ"); return false; }
  }

  function openDialog(kind: "zoom" | "view" | "edit" | "confirm", item?: MatchItem) {
    if (item) focusItem(item);
    if (kind === "edit") { const current = item ?? focused; if (!current || current.confirmed) return; setEditQr(current.qr); setEditRequest(current.requestId); setEditError(""); }
    setModal(kind); dialog.current?.showModal();
  }

  function updateMatch(qr: string, requestId: string, fromDialog = false) {
    if (!focused || focused.confirmed) return;
    const value = qr.trim();
    const invalid = !value ? "กรุณาระบุรหัส QR" : data.items.some(item => item.id !== focused.id && item.qr === value) ? "รหัสนี้มีอยู่ในถาดแล้ว" : !matchingRequests.some(request => request.id === requestId) ? "กรุณาเลือกใบคำร้อง" : "";
    if (invalid) { if (fromDialog) setEditError(invalid); else setError(invalid); return; }
    dispatch({ items: data.items.map(item => item.id === focused.id ? { ...item, qr: value, requestId, confidence: item.qr === value ? item.confidence : null } : item) });
    setNotice("ปรับปรุงการจับคู่แล้ว"); setError(""); setPendingRequest(""); setRequestSearch("");
    if (fromDialog) dialog.current?.close();
  }

  function confirmSelection() {
    if (!checkedItems.length) return;
    if (!data.trayId.trim()) { setError("กรุณาระบุหมายเลขถาด"); return; }
    const invalid = checkedItems.find(item => matchStatus(item, data.items) !== "matched");
    if (invalid) { focusItem(invalid, true); setError("กรุณาแก้ไขรายการที่เลือกให้ครบก่อนยืนยัน"); return; }
    openDialog("confirm");
  }

  function renderTray(large = false) {
    return <div className={`matching-tray ${large ? "large" : ""}`} style={{ aspectRatio: `${data.imageWidth} / ${data.imageHeight}` }}>
      {camera === "live" || camera === "scanning" ? <video ref={large ? zoomVideo : video} muted autoPlay playsInline aria-label="ภาพจากกล้อง" className="h-full w-full object-contain" /> : data.image ? <Image unoptimized src={publicAsset(data.image)} alt="ถาดสไลด์สำหรับจับคู่คำร้อง" fill sizes={large ? "90vw" : "45vw"} className="object-contain" priority /> : <div className="exam-empty"><PortalIcon name="camera" className="size-12" /><p>ยังไม่มีภาพจากกล้อง</p></div>}
      {camera === "idle" && data.items.map(item => <button type="button" key={item.id} aria-label={`เลือกช่อง ${item.position}`} onClick={() => focusItem(item, true)} className={`matching-overlay overlay-${matchStatus(item, data.items)} ${focused?.id === item.id ? "focused" : ""}`} style={{ left: `${item.bounds.x * 100}%`, top: `${item.bounds.y * 100}%`, width: `${item.bounds.width * 100}%`, height: `${item.bounds.height * 100}%` }}><span>{item.position}</span></button>)}
    </div>;
  }

  return <div className="intake-shell matching-shell min-h-svh text-[#123269]"><WorkspaceHeader /><main className="intake-main matching-main min-h-[calc(100svh-84px)] px-5 pb-8 sm:px-8 xl:px-[3%]">
    <nav aria-label="เส้นทางหน้า" className="intake-breadcrumb flex items-center gap-3"><Link href="/portal" className="flex items-center gap-2 text-[#607da4] hover:text-blue-700"><PortalIcon name="home" />หน้าแรก</Link><PortalIcon name="chevron" className="size-3 text-[#8da2be]" /><h1 className="text-sm font-semibold">จับคู่สไลด์และคาสเซ็ต</h1></nav>
    {(notice || error) && <p role={error ? "alert" : "status"} className={`exam-notice ${error ? "error" : ""}`}>{error || notice}</p>}
    <div className="matching-layout">
      <section className="intake-panel min-w-0" aria-labelledby="camera-heading"><div className="matching-panel-header"><h2 id="camera-heading" className="intake-heading"><PortalIcon name="camera" className="size-6 text-[#0965dc]" />ภาพจากกล้อง</h2><span className={`matching-camera-state ${camera === "live" ? "live" : ""}`}><i />{camera === "live" ? "กล้องพร้อมใช้งาน" : busy ? "กำลังดำเนินการ" : "ภาพถาดล่าสุด"}</span></div>
        {renderTray()}
        <div className="matching-stats">{[{ label: "จับคู่สำเร็จ", value: counts.matched, tone: "matched" }, { label: "รหัสมีปัญหา", value: counts.unreadable + counts.duplicate, tone: "unreadable" }, { label: "ไม่พบคำร้อง", value: counts.unmatched, tone: "unmatched" }].map(stat => <div key={stat.label} className={`match-${stat.tone}`}><p><i />{stat.label}</p><strong>{stat.value}</strong></div>)}<div className="matching-confidence"><p><PortalIcon name="signal" className="size-4" />ความมั่นใจเฉลี่ย</p><strong>{average === null ? "—" : `${average}%`}</strong></div></div>
        <div className="matching-device-strip"><label><PortalIcon name="camera" /><span>กล้องที่ใช้<select aria-label="กล้องที่ใช้" value={deviceId} disabled={busy || !devices.length} onChange={event => { if (camera === "live") void startCamera(event.target.value); else setDeviceId(event.target.value); }}><option value="">กล้องเริ่มต้น</option>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `กล้อง ${index + 1}`}</option>)}</select></span></label><label><PortalIcon name="calendar" /><span>หมายเลขถาด<input aria-label="หมายเลขถาด" value={data.trayId} onChange={event => dispatch({ trayId: event.target.value })} /></span></label><div><PortalIcon name="clock" /><span>สแกนล่าสุด<strong>{new Date(data.lastScanned).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong></span></div></div>
        <div className="matching-camera-actions"><button type="button" className="intake-button" disabled={busy} onClick={() => void scanCamera()}><PortalIcon name={camera === "live" ? "scan" : "refresh"} />{camera === "live" ? "สแกนภาพ" : busy ? "กำลังดำเนินการ..." : "สแกนอีกครั้ง"}</button><button type="button" className="intake-button" disabled={!data.image && camera !== "live"} onClick={() => openDialog("zoom")}><PortalIcon name="zoom" />ขยายภาพ</button>{camera === "live" && <button type="button" className="intake-button" onClick={stopCamera}><PortalIcon name="close" />ปิดกล้อง</button>}</div>
      </section>

      <section className="intake-panel matching-results min-w-0" aria-labelledby="detected-heading"><div className="matching-results-header"><h2 id="detected-heading" className="intake-heading"><PortalIcon name="file" className="size-6 text-[#0965dc]" />รายการ QR Code ที่ตรวจพบ</h2><div className="intake-search"><PortalIcon name="search" className="size-4" /><input aria-label="ค้นหารหัส QR" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="ค้นหารหัส QR, เลขคำร้อง หรือตำแหน่ง" /></div><select aria-label="กรองสถานะการจับคู่" className="intake-select" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">แสดงทั้งหมด</option>{Object.entries(matchLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="confirmed">ยืนยันแล้ว</option></select></div>
        <div className="overflow-x-auto"><table className="intake-table matching-table w-full text-left"><thead><tr><th><input type="checkbox" aria-label="เลือกรายการทั้งหมดในหน้านี้" checked={allChecked} disabled={!selectable.length} ref={element => { if (element) element.indeterminate = !allChecked && selectable.some(item => checked.has(item.id)); }} onChange={() => setChecked(current => { const next = new Set(current); selectable.forEach(item => { if (allChecked) next.delete(item.id); else next.add(item.id); }); return next; })} /></th><th>รหัส QR</th><th>เลขคำร้อง</th><th>ตำแหน่งในถาด</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody>{visible.map(item => <tr key={item.id} className={focused?.id === item.id ? "intake-selected" : ""}><td><input type="checkbox" aria-label={`เลือกรายการ ${item.position}`} checked={!item.confirmed && checked.has(item.id)} disabled={item.confirmed} onChange={() => toggle(item)} /></td><td><button type="button" className="matching-code" onClick={() => focusItem(item)}>{item.qr || "—"}</button></td><td className="whitespace-nowrap">{item.requestId || "—"}</td><td><button type="button" className="matching-code" onClick={() => focusItem(item)}>{item.position}</button></td><td><StatusBadge item={item} items={data.items} /></td><td><div className="flex gap-2"><button type="button" className="intake-row-button" aria-label={`ดูรายการ ${item.position}`} onClick={() => openDialog("view", item)}><PortalIcon name="eye" /></button><button type="button" className="intake-row-button" aria-label={`แก้ไขรายการ ${item.position}`} disabled={item.confirmed} onClick={() => openDialog("edit", item)}><PortalIcon name="edit" /></button></div></td></tr>)}{!visible.length && <tr><td colSpan={6} className="py-12! text-center text-[#8c9db4]">ไม่พบรายการ</td></tr>}</tbody></table></div>
        <div className="matching-pagination"><span>แสดง {visibleItems.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, visibleItems.length)} จาก {visibleItems.length} รายการ</span><div><button type="button" className="intake-page" aria-label="หน้าก่อนหน้า" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><PortalIcon name="chevron" className="size-3 rotate-180" /></button><span>{currentPage} / {pages}</span><button type="button" className="intake-page" aria-label="หน้าถัดไป" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><PortalIcon name="chevron" className="size-3" /></button></div></div>
        <section className="matching-details" aria-labelledby="details-heading"><h3 id="details-heading" className="intake-heading"><PortalIcon name="file" className="size-6 text-[#0965dc]" />รายละเอียดรายการที่เลือก</h3>{focused ? <div className="matching-details-grid"><dl><div><dt>รหัส QR</dt><dd>{focused.qr || "—"}</dd></div><div><dt>เลขคำร้อง</dt><dd>{focused.requestId ? <button type="button" className="text-[#0763db] underline" onClick={() => openDialog("view")}>{focused.requestId}</button> : "—"}</dd></div><div><dt>ตำแหน่งในถาด</dt><dd>{focused.position}</dd></div><div><dt>ประเภท</dt><dd>{focused.kind === "cassette" ? "คาสเซ็ต" : "สไลด์"}</dd></div><div><dt>สถานะ</dt><dd><StatusBadge item={focused} items={data.items} /></dd></div><div><dt>ความมั่นใจ</dt><dd>{focused.confidence === null ? "—" : `${focused.confidence}%`}</dd></div></dl><div className="matching-manual"><h4>ปรับปรุงการจับคู่</h4><input className="intake-select" aria-label="ค้นหาใบคำร้องเพื่อจับคู่" placeholder="ค้นหาเลขคำร้อง..." value={requestSearch} disabled={focused.confirmed} onChange={event => { setRequestSearch(event.target.value); setPendingRequest(""); }} /><select aria-label="เลือกใบคำร้องเพื่อจับคู่" className="intake-select" value={pendingRequest} disabled={focused.confirmed} onChange={event => setPendingRequest(event.target.value)}><option value="">เลือกใบคำร้อง</option>{matchingRequests.filter(request => `${request.id} ${request.sender} ${request.hn}`.toLowerCase().includes(requestSearch.toLowerCase())).map(request => <option key={request.id} value={request.id}>{request.id} · {request.sender}</option>)}</select><button type="button" className="intake-button" disabled={!pendingRequest || focused.confirmed} onClick={() => updateMatch(focused.qr, pendingRequest)}><PortalIcon name="check" />บันทึกการจับคู่</button>{!focused.qr && !focused.confirmed && <button type="button" className="matching-text-button" onClick={() => openDialog("edit")}>ระบุรหัส QR</button>}</div></div> : <p className="py-8 text-center text-sm text-[#8495af]">เลือกรายการเพื่อดูรายละเอียด</p>}</section>
      </section>
    </div>
    <footer className="intake-panel matching-footer"><Link href="/portal" className="intake-button"><PortalIcon name="arrow" className="rotate-180" />ย้อนกลับ</Link><div><span className="matching-selection-count">เลือก {checkedItems.length} รายการ</span><button type="button" className="intake-button" disabled={busy || camera === "live"} onClick={() => saveDraft()}><PortalIcon name="save" />บันทึกฉบับร่าง</button><button type="button" className="intake-button intake-button-primary" disabled={!checkedItems.length || busy || camera === "live"} onClick={confirmSelection}><PortalIcon name="check" />ยืนยันการจับคู่</button></div></footer>
  </main>

  <dialog ref={dialog} aria-labelledby="matching-dialog-title" className={`matching-dialog ${modal === "zoom" ? "matching-zoom-dialog" : ""}`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="matching-panel-header"><h2 id="matching-dialog-title" className="intake-heading">{modal === "zoom" ? "ภาพถาด" : modal === "edit" ? "แก้ไขการจับคู่" : modal === "confirm" ? "ยืนยันการจับคู่" : "รายละเอียดรายการ"}</h2><button type="button" aria-label="ปิดหน้าต่าง" className="portal-icon-button" onClick={() => dialog.current?.close()}><PortalIcon name="close" /></button></div>
    {modal === "zoom" ? renderTray(true) : modal === "confirm" ? <><p className="text-sm leading-7">ยืนยันการจับคู่ {checkedItems.length} รายการ หลังยืนยันจะไม่สามารถแก้ไขได้</p><ul className="matching-confirm-list">{checkedItems.map(item => <li key={item.id}><span>{item.position} · {item.qr}</span><span>{item.requestId}</span></li>)}</ul><div className="exam-dialog-actions"><button type="button" className="intake-button" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="button" className="intake-button intake-button-primary" onClick={() => { if (checkedItems.some(item => matchStatus(item, data.items) !== "matched")) { dialog.current?.close(); setError("กรุณาตรวจสอบรายการอีกครั้ง"); return; } const next = data.items.map(item => checked.has(item.id) ? { ...item, confirmed: true } : item); if (saveDraft(next)) { dispatch({ items: next }); setChecked(new Set()); setNotice("ยืนยันการจับคู่แล้ว"); dialog.current?.close(); } }}>ยืนยัน</button></div></> : modal === "edit" && focused ? <form onSubmit={event => { event.preventDefault(); updateMatch(editQr, editRequest, true); }}><label className="intake-edit-label">รหัส QR<input required maxLength={128} className="intake-select" value={editQr} onChange={event => setEditQr(event.target.value)} /></label><label className="intake-edit-label mt-4">เลขคำร้อง<select required className="intake-select" value={editRequest} onChange={event => setEditRequest(event.target.value)}><option value="">เลือกใบคำร้อง</option>{matchingRequests.map(request => <option key={request.id} value={request.id}>{request.id} · {request.sender}</option>)}</select></label>{editError && <p role="alert" className="mt-3 text-sm text-red-600">{editError}</p>}<div className="exam-dialog-actions"><button type="button" className="intake-button" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="submit" className="intake-button intake-button-primary">บันทึก</button></div></form> : focused && <dl className="matching-view-details">{[["รหัส QR", focused.qr || "—"], ["เลขคำร้อง", focused.requestId || "—"], ["ตำแหน่งในถาด", focused.position], ["หมายเลขถาด", data.trayId || "—"], ["สถานะ", focused.confirmed ? "ยืนยันแล้ว" : matchLabels[matchStatus(focused, data.items)]], ["HN", matchingRequests.find(request => request.id === focused.requestId)?.hn || "—"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  </dialog>
  </div>;
}
