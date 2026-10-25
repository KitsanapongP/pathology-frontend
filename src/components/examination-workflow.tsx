"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PortalIcon, { type PortalIconName } from "./portal-icon";
import ExaminationPedal from "./examination-pedal";
import ExaminationFootKey from "./examination-foot-key";
import ExaminationMicStatus from "./examination-mic-status";
import ExaminationDevTools from "./examination-dev-tools";
import ExaminationPedalButton from "./examination-pedal-button";
import { blankParts, examinationRequests, recordingBlockReason, readyForRecording, shortTime, type ExaminationPart, type ExaminationRequest } from "@/lib/examination-data";
import { normalizeSpokenDigits, pedalTiming, voiceInstructions, type PedalAction, type ExaminationScreen, type ExaminationPanel } from "@/lib/examination-controls";
import { readExaminationDraft, writeExaminationDraft, type ExaminationClip, type ExaminationDraft } from "@/lib/examination-drafts";
import { useExaminationPedals } from "@/hooks/use-examination-pedals";
import { useExaminationVoice } from "@/hooks/use-examination-voice";
import { useExaminationFocus, type FootTarget } from "@/hooks/use-examination-focus";

const requests = examinationRequests();

export default function ExaminationWorkflow() {
  const [screen, setScreen] = useState<ExaminationScreen>("standby");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ExaminationRequest[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<ExaminationRequest | null>(null);
  const [parts, setParts] = useState(blankParts);
  const [partId, setPartId] = useState("A");
  const [clips, setClips] = useState<ExaminationClip[]>([]);
  const [clipId, setClipId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftReadFailed, setDraftReadFailed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "idle">("idle");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [panel, setPanel] = useState<ExaminationPanel | null>(null);
  const [editingLine, setEditingLine] = useState("");
  const [devOpen, setDevOpen] = useState(false);
  const [speechPreviewText, setSpeechPreviewText] = useState("");
  const [entry, setEntry] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [speechMode, setSpeechMode] = useState<"dictation" | "command">("dictation");
  const [past, setPast] = useState<ExaminationPart[][]>([]);
  const [future, setFuture] = useState<ExaminationPart[][]>([]);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const rail = useRef<HTMLElement>(null);
  const panelDialog = useRef<HTMLDialogElement>(null);
  const speechTarget = useRef<(FootTarget & { partId: string }) | null>(null);
  const pedalVoiceAction = useRef<PedalAction | null>(null);
  const hydrated = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const stage = screen === "record" ? 2 : screen === "review" || screen === "complete" ? 3 : 1;
  const part = parts.find(item => item.id === partId) ?? parts[0];
  const totalSeconds = clips.reduce((sum, item) => sum + item.seconds, 0);
  const activeClip = clips.find(item => item.id === clipId) ?? clips.at(-1);
  const lineCount = parts.reduce((sum, item) => sum + item.lines.length, 0);
  const context = help ? "help" : confirmOpen ? "confirm" : panel ?? screen;
  const focus = useExaminationFocus({ context, ready: !loading, root: () => help ? helpDialog.current : confirmOpen ? modal.current : panel ? panelDialog.current : rail.current });
  const voice = useExaminationVoice({
    command: text => { setSpeechPreviewText(text); executeCommand(text); },
    dictation: (text, target) => { setSpeechPreviewText(text); addText(text, target); },
    search: text => {
      setSpeechPreviewText(text);
      if (context === "case" || /^(เลือกรายการที่|ช่วยเหลือ|คำสั่งทั้งหมด|ย้อนกลับ|ยกเลิก)/.test(text.trim())) executeCommand(text);
      else search(text);
    },
    field: text => { setSpeechPreviewText(text); applyFieldSpeech(text); },
    clip: clip => { setClips(current => [...current, clip]); setClipId(clip.id); setSaveStatus("idle"); }, notice: setNotice,
  }, context);
  const busy = Boolean(voice.mode);
  const voiceLabel = focus.target.field === "line" ? "แก้บรรทัดที่เลือก" : focus.target.field === "entry" ? "เพิ่มข้อความ" : context === "standby" || context === "case" ? "พูดเลขคำร้อง" : context === "record" && speechMode === "dictation" ? "บอกผลตรวจ" : "พูดคำสั่ง";
  const presentation = { voiceLabel, confirmFocused: focus.target.confirm, adjusting: focus.target.adjusting };
  const pedals = useExaminationPedals({
    context,
    enabled: !busy && !loading,
    confirmFocused: focus.target.confirm,
    start: action => {
      if (loading || busy) return;
      if (!help && panel && panel !== "entry" && panel !== "edit") return;
      audio.current?.pause(); setNotice("");
      pedalVoiceAction.current = action;
      const target = { ...focus.getTarget(), partId }; speechTarget.current = target;
      if (action !== "speak") return;
      if (target.field === "line" || target.field === "entry") { void voice.start("field", partId); return; }
      if (context === "standby" || context === "case") { void voice.start("search"); return; }
      if (screen === "record" && !panel && !help && !confirmOpen && speechMode === "dictation" && !confirmed) { void voice.start("dictation", partId); return; }
      void voice.start("command");
    },
    stop: (action, cancelled) => {
      // A rapid release can precede the render that exposes voice.mode.
      if (pedalVoiceAction.current !== action) return;
      pedalVoiceAction.current = null;
      voice.stop(cancelled);
    },
    perform: performPedalAction,
  });
  useEffect(() => {
    const element = audio.current;
    if (!element || !activeClip) return;
    const url = URL.createObjectURL(activeClip.blob); element.src = url;
    return () => { element.pause(); element.removeAttribute("src"); URL.revokeObjectURL(url); };
  }, [activeClip]);
  useEffect(() => { if (confirmOpen) modal.current?.showModal(); else modal.current?.close(); }, [confirmOpen]);
  useEffect(() => { if (help) helpDialog.current?.showModal(); else helpDialog.current?.close(); }, [help]);
  useEffect(() => { const dialog = panelDialog.current; if (panel && dialog && !dialog.open) dialog.showModal(); else if (!panel) dialog?.close(); }, [panel]);
  useEffect(() => {
    if (!selected || !hydrated.current || loading) return;
    const draft: ExaminationDraft = { version: 2, requestId: selected.id, parts, clips, confirmed, savedAt: new Date().toISOString() };
    const timer = window.setTimeout(() => {
      setSaveStatus("saving");
      saveQueue.current = saveQueue.current.catch(() => {}).then(() => writeExaminationDraft(draft));
      void saveQueue.current.then(() => setSaveStatus("saved")).catch(() => { setSaveStatus("error"); setNotice("เก็บฉบับร่างไม่สำเร็จ งานยังอยู่ในหน้านี้ กรุณาลองบันทึกอีกครั้ง"); });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [selected, parts, clips, confirmed, loading]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (selected && (busy || (saveStatus !== "saved" && (lineCount || clips.length)))) event.preventDefault(); };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [saveStatus, selected, lineCount, clips.length, busy]);

  async function save(final = confirmed) {
    if (!selected) return true;
    if (!hydrated.current) { setNotice("ยังอ่านฉบับร่างเดิมไม่ได้ กรุณาลองเปิดเคสใหม่ก่อนบันทึก"); return false; }
    const draft: ExaminationDraft = { version: 2, requestId: selected.id, parts, clips, confirmed: final, savedAt: new Date().toISOString() };
    setSaveStatus("saving");
    try {
      saveQueue.current = saveQueue.current.catch(() => {}).then(() => writeExaminationDraft(draft));
      await saveQueue.current; setSaveStatus("saved"); return true;
    } catch { setSaveStatus("error"); setNotice("บันทึกไม่สำเร็จ กรุณาลองใหม่ก่อนออกจากเคส"); return false; }
  }
  async function choose(record: ExaminationRequest) {
    if (busy || loading) return;
    if (selected && hydrated.current && !(await save())) return;
    setPanel(null); hydrated.current = false; setLoading(true); setNotice(""); setDraftRestored(false); setDraftReadFailed(false);
    setSelected(record); setParts(blankParts()); setClips([]); setConfirmed(false); setPast([]); setFuture([]); setPartId("A"); setSaveStatus("idle"); setScreen("case");
    try {
      const draft = await readExaminationDraft(record.id);
      if (draft?.version === 2 && draft.requestId === record.id) {
        setParts(draft.parts); setClips(draft.clips); setConfirmed(draft.confirmed);
        setDraftRestored(draft.parts.some(item => item.lines.length > 0) || draft.clips.length > 0);
      } else {
        const legacy = JSON.parse(sessionStorage.getItem(`pathology:exam:${record.id}`) ?? "null");
        if (legacy?.version === 1 && legacy.requestId === record.id && Array.isArray(legacy.parts) && legacy.parts.length === 5 && legacy.parts.every((item: ExaminationPart, index: number) => item.id === "ABCDE"[index] && Array.isArray(item.lines) && item.lines.every(line => typeof line.text === "string" && Number.isFinite(line.time)))) {
          setParts(legacy.parts); setConfirmed(Boolean(legacy.confirmed)); setNotice("นำข้อความฉบับร่างเดิมกลับมาแล้ว ฉบับร่างเดิมไม่ได้เก็บไฟล์เสียง");
        }
      }
      hydrated.current = true;
    } catch { setDraftReadFailed(true); }
    setLoading(false);
  }
  function search(value = query) {
    if (busy || loading) return;
    const normalized = normalizeSpokenDigits(value.replace(/^(ค้นหา)?\s*(เลขคำร้อง|คำร้อง|เอชเอ็น)?\s*/i, "")).trim().replace(/\s/g, "").toUpperCase();
    setQuery(normalized); setSearched(true); setScreen("standby");
    if (!normalized) { setMatches([]); setNotice("กรุณาพูดหรือพิมพ์เลขคำร้อง"); return; }
    const results = requests.filter(record => [record.id, record.hn, record.accession].some(key => key.toUpperCase().includes(normalized)));
    setMatches(results); setNotice("");
    if (results.length === 1) void choose(results[0]);
    else if (results.length > 1) setPanel("results");
  }
  function updateParts(nextParts: ExaminationPart[]) {
    if (confirmed || confirmOpen) return;
    setPast(current => [...current.slice(-49), parts]); setFuture([]); setParts(nextParts); setSaveStatus("idle");
  }
  function addText(value: string, target = partId) {
    if (!value.trim() || confirmed) return;
    const lines = value.trim().split(/\n+/).filter(Boolean).map(text => ({ id: crypto.randomUUID(), time: totalSeconds, text: text.trim() }));
    updateParts(parts.map(item => item.id === target ? { ...item, lines: [...item.lines, ...lines] } : item)); setEntry("");
  }
  function applyFieldSpeech(text: string) {
    const target = speechTarget.current;
    if (target?.field === "entry" || target?.field === "line") setEntry(text);
  }
  function undo() {
    if (confirmed || busy || confirmOpen) return;
    const previous = past.at(-1);
    if (previous) { setFuture(current => [parts, ...current]); setParts(previous); setPast(current => current.slice(0, -1)); setSaveStatus("idle"); }
  }
  function redo() {
    if (confirmed || busy || confirmOpen) return;
    const nextParts = future[0];
    if (nextParts) { setPast(current => [...current, parts]); setParts(nextParts); setFuture(current => current.slice(1)); setSaveStatus("idle"); }
  }
  function changePart(id: string) {
    if (busy || confirmOpen) { setNotice("ปล่อยแป้นเหยียบและรอประมวลผลก่อนเปลี่ยนหัวข้อ"); return; }
    setPartId(id); setEntry("");
  }
  async function next() {
    if (busy || loading || help || panel) return;
    if (confirmOpen) return;
    setNotice("");
    if (screen === "standby") { search(); return; }
    if (screen === "case") {
      if (!selected || !readyForRecording(selected)) { setNotice("คำร้องนี้ยังไม่พร้อมบันทึก กรุณาเลือกคำร้องที่ตรวจสอบแล้ว"); return; }
      if (!hydrated.current) { await choose(selected); return; }
      setScreen(confirmed ? "review" : "record"); return;
    }
    if (screen === "record") {
      if (!lineCount && !clips.length) { setNotice("บันทึกเสียงหรือเพิ่มข้อความก่อนตรวจสอบผล"); return; }
      if (await save()) { audio.current?.pause(); setScreen("review"); } return;
    }
    if (screen === "review") {
      if (confirmed) { setScreen("complete"); return; }
      if (!lineCount || parts.some(item => item.lines.some(line => !line.text.trim()))) { setNotice("ต้องมีข้อความผลตรวจ และไม่มีบรรทัดว่าง ก่อนยืนยัน"); return; }
      audio.current?.pause(); setConfirmOpen(true); return;
    }
    if (screen === "complete") await reset();
  }
  async function back() {
    if (focus.leaveAdjustment()) return;
    if (help) { setHelp(false); return; }
    if (confirmOpen) { setConfirmOpen(false); setNotice(""); return; }
    if (panel) { setPanel(panel === "edit" ? "lines" : panel === "entry" || panel === "playback" ? "tools" : null); return; }
    if (busy || loading) { setNotice("ปล่อยแป้นเหยียบและรอประมวลผลก่อนย้อนกลับ"); return; }
    audio.current?.pause();
    if (screen === "review") { setScreen(confirmed ? "case" : "record"); return; }
    if (screen === "record") { if (await save()) setScreen("case"); return; }
    if (screen === "case" || screen === "complete" || screen === "standby") await reset();
  }
  async function reset() {
    if (busy || loading || (hydrated.current && !(await save()))) return;
    hydrated.current = false;
    setSelected(null); setParts(blankParts()); setClips([]); setConfirmed(false); setQuery(""); setMatches([]); setSearched(false); setScreen("standby"); setNotice(""); setSaveStatus("idle"); setPanel(null); setEntry(""); setPast([]); setFuture([]); setDraftRestored(false); setDraftReadFailed(false);
  }
  async function confirmResult() {
    if (!confirmOpen || busy || loading || !lineCount || confirmed) return;
    setLoading(true);
    if (await save(true)) { setConfirmed(true); setConfirmOpen(false); setScreen("complete"); setNotice(""); }
    setLoading(false);
  }
  function performPedalAction(action: PedalAction) {
    if (action === "back") { void back(); return; }
    if (loading || busy) return;
    if (action === "previousControl") { focus.move(-1); return; }
    if (action === "nextControl") { focus.move(1); return; }
    if (action === "activate") { focus.activate(); return; }
    if (action === "help") { audio.current?.pause(); setHelp(current => !current); return; }
    if (action === "confirm") { void confirmResult(); return; }
  }
  function executeCommand(raw: string) {
    const value = raw.trim().replace(/[.!?。]+$/, "");
    setCommandInput(""); setNotice(`รับคำสั่ง: “${value}”`);
    if (/^(เลื่อนลง|เลื่อนขึ้น)$/.test(value)) {
      const direction = value === "เลื่อนลง" ? 1 : -1;
      const target = help ? helpDialog.current?.querySelector("section") : confirmOpen ? modal.current : panel ? panelDialog.current?.querySelector(".station-dialog-content") : screen === "record" || screen === "review" ? document.getElementById("station-transcript") : null;
      if (target) target.scrollBy({ top: direction * 350, behavior: "smooth" });
      else if (!help && !confirmOpen && !panel) window.scrollBy({ top: direction * window.innerHeight * .6, behavior: "smooth" });
      return;
    }
    if (/^(ช่วยเหลือ|คำสั่งทั้งหมด)$/.test(value)) { setHelp(true); return; }
    if (/^(ย้อนกลับ|ยกเลิก|ปิดคู่มือ)$/.test(value)) { void back(); return; }
    if (/^(ไปต่อ|ถัดไป|เปิดคำร้อง|เริ่มบันทึก|ไปตรวจสอบผล|ยืนยันผลตรวจ|เคสถัดไป)$/.test(value)) { void next(); return; }
    if (help || confirmOpen || panel) { setNotice("ใช้ซ้ายหรือขวาเลือกปุ่ม แล้วแตะกลาง หรือซ้ายสองครั้งเพื่อปิด"); return; }
    if (stage === 1) {
      const item = normalizeSpokenDigits(value).match(/^เลือกรายการที่\s*(\d+)$/);
      if (item) { const record = matches[Number(item[1]) - 1]; if (record) void choose(record); else setNotice("ไม่พบลำดับรายการนี้"); return; }
      const term = value.replace(/^(ค้นหา)?\s*(คำร้อง|เลขคำร้อง|เอชเอ็น|HN)?\s*/i, "");
      if (/\d|[๐-๙]|ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า/.test(term)) { search(term); return; }
    }
    if (screen !== "record" && screen !== "review") { setNotice("ไม่พบคำสั่งนี้ กลางค้างแล้วพูดเลขคำร้อง หรือเปิดคู่มือคำสั่ง"); return; }
    const target = value.match(/^(?:ไป\s*)?(?:part|พาร์ท|พาร์ต|พาท|พาร์)\s*([a-e]|เอ|บี|ซี|ดี|อี)$/i);
    if (target) { const names: Record<string, string> = { เอ: "A", บี: "B", ซี: "C", ดี: "D", อี: "E" }; changePart(names[target[1]] ?? target[1].toUpperCase()); return; }
    if (/^หัวข้อ(ถัดไป|ก่อนหน้า)$/.test(value)) { const index = parts.findIndex(item => item.id === partId); changePart(parts[Math.max(0, Math.min(parts.length - 1, index + (value.includes("ถัดไป") ? 1 : -1)))].id); return; }
    if (value === "บันทึกฉบับร่าง") { void save(); return; }
    if (value === "ย้อนการแก้ไข") { undo(); return; }
    if (value === "ทำซ้ำ") { redo(); return; }
    const lineEdit = value.match(/^แก้บรรทัดที่\s*(.+?)\s*เป็น\s*(.+)$/);
    const lineDelete = value.match(/^ลบบรรทัดที่\s*(.+)$/);
    if (lineEdit || lineDelete) {
      const index = Number(normalizeSpokenDigits((lineEdit ?? lineDelete)![1]).replace(/\s/g, "")) - 1;
      if (!Number.isInteger(index) || !part.lines[index]) { setNotice("ไม่พบบรรทัดนี้ในหัวข้อปัจจุบัน"); return; }
      updateParts(parts.map(item => item.id !== partId ? item : { ...item, lines: lineEdit ? item.lines.map((line, position) => position === index ? { ...line, text: lineEdit[2].trim() } : line) : item.lines.filter((_, position) => position !== index) })); return;
    }
    if (value === "ลบข้อความล่าสุด") { updateParts(parts.map(item => item.id === partId ? { ...item, lines: item.lines.slice(0, -1) } : item)); return; }
    if (value.startsWith("แก้ข้อความล่าสุดเป็น")) {
      const replacement = value.slice("แก้ข้อความล่าสุดเป็น".length).trim();
      if (replacement && part.lines.length) updateParts(parts.map(item => item.id === partId ? { ...item, lines: item.lines.map((line, index) => index === item.lines.length - 1 ? { ...line, text: replacement } : line) } : item));
      else setNotice("ยังไม่มีข้อความให้แก้ หรือยังไม่ได้ระบุข้อความใหม่"); return;
    }
    const clipChoice = normalizeSpokenDigits(value).match(/^เลือกช่วงเสียงที่\s*(\d+)$/);
    if (clipChoice || /^(ช่วงเสียงถัดไป|ช่วงเสียงก่อนหน้า)$/.test(value)) {
      const current = clips.findIndex(item => item.id === activeClip?.id);
      const index = clipChoice ? Number(clipChoice[1]) - 1 : current + (value === "ช่วงเสียงถัดไป" ? 1 : -1);
      if (clips[index]) { setClipId(clips[index].id); setPlayTime(0); }
      else setNotice("ไม่มีช่วงเสียงนี้"); return;
    }
    if (/^(เล่นเสียง|ฟังเสียง)$/.test(value)) { if (activeClip) void audio.current?.play().catch(() => setNotice("เล่นเสียงไม่ได้ กรุณาลองใหม่")); else setNotice("ยังไม่มีเสียงที่บันทึกไว้"); return; }
    if (/^(หยุดเล่น|พักเสียง)$/.test(value)) { audio.current?.pause(); return; }
    if (value === "ย้อนห้าวินาที") { if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime - 5); return; }
    setNotice("ยังไม่รองรับคำสั่งนี้ เปิดคู่มือเพื่อดูคำสั่งที่ใช้ได้ในเวอร์ชันนี้");
  }

  const primaryLabel = screen === "standby" ? "ค้นหาคำร้อง" : screen === "case" ? draftReadFailed ? "ลองเปิดคำร้องอีกครั้ง" : confirmed ? "เปิดผลตรวจ" : "เริ่มบันทึก" : screen === "record" ? "ตรวจสอบผล" : screen === "review" ? confirmed ? "เสร็จสิ้น" : "ยืนยันผล" : "เคสถัดไป";
  const caseBlockReason = selected ? recordingBlockReason(selected) : null;
  const caseStatusTone = loading ? "loading" : caseBlockReason || draftReadFailed ? "blocked" : "ready";
  const caseStatusText = loading ? "กำลังตรวจสอบคำร้อง" : caseBlockReason ? `ยังเริ่มบันทึกไม่ได้ · ${caseBlockReason}` : draftReadFailed ? "อ่านฉบับร่างไม่สำเร็จ · เลือกลองเปิดคำร้องอีกครั้ง" : confirmed ? "ยืนยันผลไว้แล้ว · เปิดดูผลตรวจได้" : draftRestored ? "พร้อมบันทึกผล · มีฉบับร่างเดิม" : "พร้อมเริ่มบันทึกผล";
  const pedalProps = { pressed: pedals.pressed, onPress: pedals.press, onRelease: pedals.release };
  const micPhase = voice.mode === "starting" || voice.mode === "processing" ? voice.mode : voice.mode ? "listening" : "off";
  const micStatus = <ExaminationMicStatus phase={micPhase} />;
  const panelTitles: Record<ExaminationPanel, string> = { results: "เลือกคำร้อง", parts: "เปลี่ยน Part", voice: "โหมดเสียง", tools: "เครื่องมือ", lines: "เลือกบรรทัดที่จะแก้", entry: "เพิ่มข้อความ", edit: "แก้ข้อความ", playback: "ฟังเสียง" };
  type Action = { id: string; label: string; icon: PortalIconName; disabled?: boolean; initial?: boolean };
  const openEntry = () => { setEntry(""); setPanel("entry"); };
  const actions: Action[] = screen === "standby" ? [
    { id: "search", label: "ค้นหาคำร้อง", icon: "search", initial: true },
  ] : screen === "case" ? [
    { id: "search", label: "ค้นหาคำร้อง", icon: "search", initial: !selected || !readyForRecording(selected) },
    { id: "start", label: primaryLabel, icon: "arrow", disabled: !selected || !readyForRecording(selected), initial: Boolean(selected && readyForRecording(selected)) },
  ] : screen === "record" ? [
    { id: "voice", label: "โหมดเสียง", icon: speechMode === "dictation" ? "microphone" : "workflow", initial: true },
    { id: "parts", label: "เปลี่ยน Part", icon: "folder" },
    { id: "save", label: "บันทึกร่าง", icon: "save" },
    { id: "review", label: "ตรวจสอบผล", icon: "checkCircle", disabled: !lineCount && !clips.length },
    { id: "tools", label: "เครื่องมือ", icon: "menu" },
  ] : screen === "review" ? [
    { id: "parts", label: "เปลี่ยน Part", icon: "folder" },
    { id: "edit", label: "แก้ข้อความ", icon: "edit", disabled: confirmed || !part.lines.length },
    { id: "save", label: "บันทึกร่าง", icon: "save", disabled: confirmed },
    { id: "confirm", label: primaryLabel, icon: "checkCircle", initial: true, disabled: !lineCount },
    { id: "tools", label: "เครื่องมือ", icon: "menu" },
  ] : [
    { id: "view", label: "เปิดผลตรวจ", icon: "file" },
    { id: "next", label: "เคสถัดไป", icon: "arrow", initial: true },
  ];
  function runRailAction(id: string) {
    if (busy || loading) return;
    if (id === "search") search();
    else if (id === "back") void back();
    else if (id === "start" || id === "review" || id === "confirm") void next();
    else if (id === "save") void save();
    else if (id === "next") void reset();
    else if (id === "view") setScreen("review");
    else if (id === "edit") setPanel("lines");
    else if (id === "voice" || id === "parts" || id === "tools") setPanel(id);
  }
  const choice = (label: string, icon: PortalIconName, run: () => void, initial = false, disabled = false) => <button key={label} type="button" data-pedal-target data-pedal-default={initial ? "" : undefined} aria-label={label} disabled={busy || loading || disabled} onClick={run} className="station-choice"><PortalIcon name={icon} /><span>{label}</span></button>;
  const gestureStrip = <div className="station-gesture-strip" data-pedal-ignore>
    <span><ExaminationFootKey pedal="left" /><ExaminationFootKey pedal="right" /><span>{focus.target.adjusting ? "ปรับค่า" : "เลือก"}</span></span>
    <span><ExaminationFootKey /><span>{context === "confirm" && focus.target.confirm ? "ค้าง 1.5 วินาที" : focus.target.adjusting ? "กดเพื่อเสร็จ" : "กดเพื่อทำงาน"}</span></span>
  </div>;
  const devTools = process.env.NODE_ENV === "development" ? <ExaminationDevTools {...pedalProps}
    open={devOpen} onToggle={() => { if (devOpen) pedals.cancel(); setDevOpen(!devOpen); }}
    context={context} primaryAction={primaryLabel} presentation={presentation} command={commandInput} onCommandChange={setCommandInput}
    onCommand={() => { if (!busy) executeCommand(commandInput); }} speechSupported={voice.support?.speech} busy={busy}
    speechText={voice.interim || voice.error || speechPreviewText} /> : null;

  return <div className="station-shell">
    <header className="station-header">
      <Link href="/portal" className="station-brand" aria-label="กลับหน้าหลักพยาธิวิทยา"><PortalIcon name="waveform" /><span>พยาธิวิทยา</span></Link>
      <div className="station-header-actions"><button aria-label="เปิดคู่มือ" onClick={() => setHelp(true)}><PortalIcon name="file" />คู่มือ</button></div>
    </header>
    <main className={`station-main ${screen === "standby" || screen === "case" ? "is-lookup" : ""}`}>
      {(screen === "standby" || screen === "case") && <div className={`station-lookup ${screen === "case" ? "has-case" : ""}`}>
      <section className="station-standby">
        <h1>ระบุเลขคำร้อง</h1>
        <form onSubmit={event => { event.preventDefault(); search(); }} className="station-search-form"><PortalIcon name="search" /><input autoFocus={screen === "standby"} aria-label="เลขคำร้องหรือ HN" placeholder="เลขคำร้อง หรือ HN" value={voice.destination === "search" && busy ? voice.interim : query} readOnly={busy} onChange={event => setQuery(event.target.value)} /><span className="station-search-mic">{!help && !confirmOpen && !panel && micStatus}</span><button aria-label="ค้นหา" disabled={busy || loading}><PortalIcon name="arrow" /></button></form>
        {screen === "case" && <div className={`station-lookup-status ${caseStatusTone}`} role="status" aria-live="polite"><PortalIcon name={caseStatusTone === "ready" ? "checkCircle" : caseStatusTone === "blocked" ? "close" : "clock"} /><span>{caseStatusText}</span></div>}
        <p className="station-sample-note">ทดลอง 0038 — พูด “ศูนย์ ศูนย์ สาม แปด” หรือพิมพ์ 0036</p>
        <ExaminationPedal {...pedalProps} context={context} primaryAction={primaryLabel} presentation={presentation} />
        <div className="station-start-voice"><ExaminationFootKey /><PortalIcon name="microphone" /><span>เหยียบค้าง พูดเลขคำร้อง แล้วปล่อย</span></div>
        {searched && !matches.length && <p className="station-inline-error"><PortalIcon name="search" />ไม่พบคำร้อง ลองระบุเลขใหม่</p>}
      </section>
      {screen === "case" && selected && <section className="station-case-preview">
        <PortalIcon name="file" /><h2>{confirmed ? "ผลที่ยืนยันแล้ว" : "ตรวจสอบคำร้อง"}</h2><span className={`station-case-badge ${!readyForRecording(selected) ? "unready" : ""}`}>{confirmed ? "ยืนยันแล้ว" : readyForRecording(selected) ? "พร้อมบันทึก" : selected.review}</span>
        <dl><div><dt>เลขคำร้อง</dt><dd>{selected.id}</dd></div><div><dt>HN</dt><dd>{selected.hn}</dd></div><div><dt>ประเภท</dt><dd>{selected.category}</dd></div><div><dt>ผู้ส่งตรวจ</dt><dd>{selected.sender}</dd></div><div><dt>เลขการตรวจ</dt><dd>{selected.accession || "ยังไม่มีเลขการตรวจ"}</dd></div></dl>
      </section>}
      </div>}
      {selected && (screen === "record" || screen === "review") && <div className="station-case-bar"><strong>{selected.id}</strong><span>{selected.hn}</span><span>{selected.accession || "ยังไม่มีเลขการตรวจ"}</span><span className="station-save-state" role="status"><PortalIcon name={saveStatus === "error" ? "bell" : "check"} />{saveStatus === "saved" ? "เก็บในเครื่องแล้ว" : saveStatus === "saving" ? "กำลังเก็บ…" : saveStatus === "error" ? "เก็บไม่สำเร็จ" : "รอเก็บข้อมูล"}</span></div>}
      {(screen === "record" || screen === "review") && <section className="station-report-workspace">
        <div className="station-report-heading"><div><span className="station-stage-icon"><PortalIcon name={screen === "record" ? "microphone" : "checkCircle"} /></span><h1>{screen === "record" ? "บันทึกผลการตรวจ" : "ตรวจสอบผลการตรวจ"}</h1></div><span className="station-report-meta">{!help && !confirmOpen && !panel && micStatus}<span>{confirmed ? "ยืนยันแล้ว" : `${part.lines.length} บรรทัด`}<span className="station-divider">·</span>{shortTime(totalSeconds)}</span></span></div>
        <div className="station-part-strip" aria-label="หัวข้อผลการตรวจ">{parts.map(item => <span key={item.id} aria-current={item.id === partId ? "true" : undefined} className={item.id === partId ? "active" : ""}>Part {item.id}{item.lines.length > 0 && <i />}</span>)}</div>
        <article className="station-document" id="station-transcript" aria-label={`ผลตรวจ Part ${partId}`}><h2>{part.title}</h2>{!part.lines.length && !voice.interim && <p className="station-empty-document">ยังไม่มีข้อความ</p>}<div className="station-report-lines">{part.lines.map((line, index) => <div key={line.id}><span>{String(index + 1).padStart(2, "0")}</span><p>{line.text}</p></div>)}{voice.interim && voice.destination === "dictation" && <div className="station-interim"><PortalIcon name="microphone" /><p>{voice.interim}</p></div>}</div></article>
      </section>}
      {screen === "complete" && selected && <section className="station-complete"><PortalIcon name="checkCircle" /><h1>บันทึกในเครื่องแล้ว</h1><p>{selected.id}</p><p>ยังไม่ส่งเข้าระบบโรงพยาบาล</p>{!help && !confirmOpen && !panel && micStatus}</section>}
    </main>
    {notice && <div className="station-notice" role="status"><PortalIcon name="bell" /><span>{notice}</span><button aria-label="ปิดข้อความแจ้งเตือน" onClick={() => setNotice("")}><PortalIcon name="close" /></button></div>}
    <nav ref={rail} className="station-command-rail" aria-label="คำสั่งที่ใช้กับแป้นเหยียบ">
      <div className="station-rail-activate" data-pedal-ignore><ExaminationFootKey /><span>เลือก</span></div>
      <div className="station-command-navigation">
        {actions.length > 1 && <span className="station-rail-direction left" data-pedal-ignore><PortalIcon name="arrow" /><ExaminationFootKey pedal="left" /></span>}
        <div className="station-command-items" style={{ maxWidth: actions.length * 262 - 12 }}>{actions.map(action => <button key={action.id} data-pedal-target data-action-id={action.id} data-pedal-default={action.initial ? "" : undefined} aria-current={focus.target.label === action.label ? "true" : undefined} aria-label={action.label} disabled={busy || loading || action.disabled} onClick={event => { focus.selectTarget(event.currentTarget); runRailAction(action.id); }}><PortalIcon name={action.icon} /><span>{action.label}</span></button>)}</div>
        {actions.length > 1 && <span className="station-rail-direction right" data-pedal-ignore><ExaminationFootKey pedal="right" /><PortalIcon name="arrow" /></span>}
      </div>
      <div className="station-shortcuts"><span><PortalIcon name="undo" /><ExaminationFootKey pedal="left" />×2 กลับ</span><span><PortalIcon name="file" /><ExaminationFootKey pedal="right" />×2 คู่มือ</span></div>
    </nav>
    {!help && !confirmOpen && !panel && devTools}
    <audio ref={audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setPlayTime(audio.current?.currentTime ?? 0)} onError={() => setNotice("เปิดเสียงไม่ได้ ลองเลือกช่วงเสียงใหม่")} />

    <dialog ref={panelDialog} className="station-dialog" aria-labelledby="station-panel-title" onCancel={event => { event.preventDefault(); void back(); }}>
      <div className="station-dialog-heading"><h2 id="station-panel-title">{panel ? panelTitles[panel] : ""}</h2><button aria-label="ปิดหน้าต่าง" onClick={() => { void back(); }}><PortalIcon name="close" /></button></div>
      <div className="station-dialog-content">
        {panel === "results" && <div className="station-result-list">{matches.map((record, index) => <button key={record.id} data-pedal-target data-pedal-default={index === 0 ? "" : undefined} aria-label={record.id} onClick={() => { void choose(record); }}><PortalIcon name="file" /><span><strong>{record.id}</strong><span>{record.hn} · {readyForRecording(record) ? "พร้อมบันทึก" : record.review}</span></span><PortalIcon name="arrow" /></button>)}</div>}
        {panel === "parts" && <div className="station-part-picker">{parts.map(item => <button key={item.id} data-pedal-target data-pedal-default={item.id === partId ? "" : undefined} aria-label={`Part ${item.id}`} aria-current={item.id === partId ? "true" : undefined} onClick={() => { changePart(item.id); setPanel(null); }}><span>{item.id}</span>{item.id === partId && <PortalIcon name="check" />}</button>)}</div>}
        {panel === "voice" && <div className="station-voice-picker">
          <button data-pedal-target data-pedal-default={speechMode === "dictation" ? "" : undefined} aria-label="บอกผล" onClick={() => { setSpeechMode("dictation"); setPanel(null); }}><PortalIcon name="microphone" /><strong>บอกผล</strong><span>คำพูดเพิ่มลงในผลตรวจ</span></button>
          <button data-pedal-target data-pedal-default={speechMode === "command" ? "" : undefined} aria-label="พูดคำสั่ง" onClick={() => { setSpeechMode("command"); setPanel(null); }}><PortalIcon name="workflow" /><strong>พูดคำสั่ง</strong><span>เช่น “ไป Part B”</span></button>
        </div>}
        {panel === "tools" && <div className="station-tool-grid">
          {choice("เพิ่มข้อความ", "edit", openEntry, true, confirmed)}
          {choice("ฟังเสียง", "volume", () => setPanel("playback"), false, !clips.length)}
          {choice("ย้อนการแก้ไข", "undo", undo, false, confirmed || !past.length)}
          {choice("ทำซ้ำ", "redo", redo, false, confirmed || !future.length)}
          {choice("พูดคำสั่ง", "workflow", () => { setSpeechMode("command"); setPanel(null); }, false, confirmed)}
          {choice("กลับ", "arrow", () => setPanel(null))}
        </div>}
        {panel === "lines" && <div className="station-line-picker">{part.lines.map((line, index) => <button key={line.id} data-pedal-target data-pedal-default={index === 0 ? "" : undefined} aria-label={`แก้บรรทัด ${index + 1}`} onClick={() => { setEditingLine(line.id); setEntry(line.text); setPanel("edit"); }}><span>{index + 1}</span><span>{line.text}</span><PortalIcon name="edit" /></button>)}</div>}
        {(panel === "entry" || panel === "edit") && <form className="station-entry-form" onSubmit={event => { event.preventDefault(); if (!entry.trim()) return; if (panel === "entry") addText(entry); else updateParts(parts.map(item => item.id !== partId ? item : { ...item, lines: item.lines.map(line => line.id === editingLine ? { ...line, text: entry.trim() } : line) })); setPanel(null); }}>
          <textarea data-pedal-target data-pedal-default data-pedal-field={panel === "edit" ? "line" : "entry"} aria-label="ข้อความผลตรวจ" rows={5} value={voice.destination === "field" && busy ? voice.interim : entry} disabled={busy} onChange={event => setEntry(event.target.value)} />
          <div className="station-form-actions"><button type="button" data-pedal-target onClick={() => { void back(); }}><PortalIcon name="undo" />กลับ</button><button data-pedal-target aria-label={panel === "entry" ? "เพิ่มข้อความ" : "บันทึกข้อความ"} disabled={!entry.trim() || busy}><PortalIcon name="check" />{panel === "entry" ? "เพิ่มข้อความ" : "บันทึกข้อความ"}</button></div>
        </form>}
        {panel === "playback" && <div className="station-playback">
          <select data-pedal-target data-pedal-default aria-label="เลือกช่วงเสียง" value={activeClip?.id ?? ""} onChange={event => { setClipId(event.target.value); setPlayTime(0); }}>{clips.map((clip, index) => <option key={clip.id} value={clip.id}>ช่วง {index + 1} · Part {clip.partId} · {shortTime(clip.seconds)}</option>)}</select>
          <div><button data-pedal-target aria-label={playing ? "พักเสียง" : "เล่นเสียง"} onClick={() => { if (playing) audio.current?.pause(); else void audio.current?.play().catch(() => setNotice("เล่นเสียงไม่ได้ ลองเลือกช่วงเสียงใหม่")); }}><PortalIcon name={playing ? "pause" : "play"} /></button><input data-pedal-target aria-label="ตำแหน่งเสียง" type="range" min="0" max={activeClip?.seconds || 1} step=".1" value={Math.min(playTime, activeClip?.seconds || 1)} onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setPlayTime(Number(event.target.value)); } }} /><span>{shortTime(playTime)}</span></div>
        </div>}
      </div>
      {gestureStrip}
      <div className="station-dialog-back"><ExaminationFootKey pedal="left" />×2 กลับ</div>
      {panel && !help && !confirmOpen && micStatus}
      {panel && !help && !confirmOpen && devTools}
    </dialog>

    {help && <dialog ref={helpDialog} className="station-dialog station-help-dialog" aria-labelledby="station-help-title" onCancel={event => { event.preventDefault(); setHelp(false); }}>
      <div className="station-dialog-heading"><h2 id="station-help-title">คู่มือแป้นเหยียบ</h2><button data-pedal-target data-pedal-default aria-label="ปิดคู่มือ" onClick={() => setHelp(false)}><PortalIcon name="close" />ปิด</button></div>
      <section className="station-help-content"><ExaminationPedal {...pedalProps} context={context} primaryAction={primaryLabel} presentation={presentation} />
        <div className="station-help-map"><div><ExaminationFootKey pedal="left" /><p>กด: เลือกก่อนหน้า</p><p>กดสองครั้ง: กลับ</p></div><div><ExaminationFootKey /><p>กด: ทำงาน</p><p>ค้าง: พูด · ปล่อย: หยุด</p></div><div><ExaminationFootKey pedal="right" /><p>กด: เลือกถัดไป</p><p>กดสองครั้ง: คู่มือ</p></div></div>
        <div className="station-command-list">{voiceInstructions.map(item => <div key={item.label}><span>{item.label}</span><span>{item.example.split(" / ").map(example => <q key={example}>{example}</q>)}</span></div>)}</div>
        <p className="station-sample-note">คำร้องทดลอง 0038 หรือ 0036 · เก็บผลในเครื่องนี้</p><p>ถอดเสียงผ่านเบราว์เซอร์ ยังไม่ใช่ STT ของโรงพยาบาล</p>
      </section><div className="station-help-scroll"><button data-pedal-target onClick={() => helpDialog.current?.querySelector("section")?.scrollBy({ top: -300, behavior: "smooth" })}><PortalIcon name="up" />เลื่อนขึ้น</button><button data-pedal-target onClick={() => helpDialog.current?.querySelector("section")?.scrollBy({ top: 300, behavior: "smooth" })}><PortalIcon name="download" />เลื่อนลง</button></div>
      {micStatus}{devTools}
    </dialog>}

    <dialog ref={modal} className="station-dialog station-confirm-dialog" aria-labelledby="station-confirm-title" onCancel={event => { event.preventDefault(); setConfirmOpen(false); }}>
      <div className="station-confirm-symbol"><PortalIcon name="checkCircle" /></div><h2 id="station-confirm-title">ยืนยันผลตรวจ</h2><p>{selected?.id} · {lineCount} บรรทัด</p><p>ยืนยันแล้วจะแก้ไขไม่ได้</p>
      <div className="station-confirm-actions"><button data-pedal-target aria-label="กลับไปตรวจผล" onClick={() => setConfirmOpen(false)}><PortalIcon name="undo" /><span>กลับไปตรวจผล</span></button>
      <ExaminationPedalButton {...pedalProps} onPress={pedal => { focus.selectTarget(modal.current?.querySelector<HTMLElement>("[data-pedal-confirm]") ?? null); pedals.press(pedal, true); }} data-pedal-target data-pedal-default data-pedal-confirm aria-label="ยืนยันผลตรวจ" pedal="center" className={`station-confirm-hold ${pedals.pressed === "center" && focus.target.confirm ? "holding" : ""}`} disabled={loading}>
        <PortalIcon name="check" /><span>ยืนยันผลตรวจ</span><i style={{ transitionDuration: `${pedalTiming.confirmHoldMs}ms` }} /></ExaminationPedalButton></div>
      <div className="station-confirm-gesture"><ExaminationFootKey /><span>{focus.target.confirm ? "ค้าง 1.5 วินาที แล้วปล่อยเพื่อยืนยัน" : "กดเพื่อกลับไปตรวจผล"}</span></div>
      {confirmOpen && !help && micStatus}
      {confirmOpen && !help && devTools}
    </dialog>
  </div>;
}
