"use client";

import { useEffect, useRef, useState } from "react";
import type { ExaminationClip } from "@/lib/examination-drafts";
import { createSpeechPreview, speechPreviewError, supportsSpeechPreview, type SpeechSession } from "@/lib/examination-speech-preview";

type Mode = "command" | "dictation" | "search" | "field";
type Callbacks = {
  command: (text: string) => void;
  dictation: (text: string, partId: string) => void;
  search: (text: string) => void;
  field: (text: string) => void;
  clip: (clip: ExaminationClip) => void;
  notice: (text: string) => void;
};

export function useExaminationVoice(callbacks: Callbacks, scope: string) {
  const latest = useRef(callbacks);
  const recognition = useRef<SpeechSession | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const active = useRef<{ mode: Mode; partId: string; token: number; started: number; ended: number | null; cancelled: boolean; final: string; interim: string } | null>(null);
  const counter = useRef(0);
  const sessionRef = useRef<typeof active.current>(null);
  const mounted = useRef(false);
  const [mode, setMode] = useState<Mode | "starting" | "processing" | null>(null);
  const [destination, setDestination] = useState<Mode | null>(null);
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<{ token: number; mode: Mode; text: string; partId: string } | null>(null);
  const delivered = useRef(0);
  const speechTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [support, setSupport] = useState<{ speech: boolean; microphone: boolean } | null>(null);
  useEffect(() => { latest.current = callbacks; }, [callbacks]);
  // Deliver after the mode update has rendered, so navigation does not see a stale busy state.
  useEffect(() => {
    if (!completed || completed.token === delivered.current) return;
    delivered.current = completed.token;
    if (sessionRef.current?.token !== completed.token || sessionRef.current.cancelled) return;
    if (completed.mode === "command") latest.current.command(completed.text);
    else if (completed.mode === "dictation") latest.current.dictation(completed.text, completed.partId);
    else if (completed.mode === "search") latest.current.search(completed.text);
    else latest.current.field(completed.text);
  }, [completed]);

  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(() => {
      if (mounted.current) {
        setSupport({ speech: supportsSpeechPreview(), microphone: typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined" });
        if (!active.current) { setMode(null); setInterim(""); }
      }
    });
    const timer = window.setInterval(() => {
      if (active.current?.mode === "dictation" && media.current?.state === "recording") setSeconds(Math.floor((Date.now() - active.current.started) / 1000));
    }, 250);
    const cancelCapture = () => {
      if (sessionRef.current) sessionRef.current.cancelled = true;
      active.current = null; recognition.current?.abort();
      if (media.current?.state === "recording") media.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      setMode(null); setInterim("");
    };
    const hidden = () => { if (document.hidden) cancelCapture(); };
    window.addEventListener("blur", cancelCapture); document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      if (sessionRef.current) sessionRef.current.cancelled = true;
      active.current = null;
      recognition.current?.abort();
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
      if (media.current?.state === "recording") media.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      window.clearInterval(timer);
      window.removeEventListener("blur", cancelCapture); document.removeEventListener("visibilitychange", hidden);
    };
  }, [scope]);

  function startRecognition(session: NonNullable<typeof active.current>) {
    const next = createSpeechPreview({
      captureStart: () => {
        if (mounted.current && active.current === session && !session.cancelled) setMode(session.mode);
      },
      captureEnd: () => {
        if (mounted.current && active.current === session && !session.cancelled && session.mode !== "dictation") setMode("processing");
      },
      transcript: (final, pending) => {
        if (session.cancelled || !mounted.current) return;
        session.final = final; session.interim = pending;
        setInterim(session.final + pending);
      },
      error: code => {
        if (session.cancelled || !mounted.current || code === "aborted") return;
        const message = speechPreviewError(code); setError(message); latest.current.notice(message);
      },
      end: () => {
        if (speechTimeout.current) { clearTimeout(speechTimeout.current); speechTimeout.current = null; }
        if (recognition.current === next) recognition.current = null;
        if (!mounted.current) return;
        const text = session.final.trim();
        if (!session.cancelled && text) {
          setCompleted({ token: session.token, mode: session.mode, text, partId: session.partId });
        } else if (!session.cancelled && session.interim.trim()) {
          latest.current.notice("เสียงช่วงนี้ยังไม่ได้ข้อความที่ยืนยันแล้ว กรุณาพูดซ้ำ เสียงที่อัดไว้ยังคงอยู่");
        }
        if (active.current === session) active.current = null;
        if (media.current?.state === "recording") { session.ended = Date.now(); media.current.stop(); }
        stream.current?.getTracks().forEach(track => track.stop());
        if (!active.current) { setMode(media.current ? "processing" : null); setInterim(""); }
      },
    });
    if (!next) { const message = "เบราว์เซอร์นี้ไม่รองรับถอดเสียง ลองเปิดหน้านี้ใน Chrome หรือพิมพ์แทน"; setError(message); latest.current.notice(message); return false; }
    recognition.current = next;
    try { next.start(); return true; }
    catch { recognition.current = null; latest.current.notice("เริ่มรับคำสั่งเสียงไม่สำเร็จ กรุณาลองใหม่"); return false; }
  }

  async function start(nextMode: Mode, partId = "A") {
    if (active.current || recognition.current || media.current) return;
    const session = { mode: nextMode, partId, token: ++counter.current, started: Date.now(), ended: null as number | null, cancelled: false, final: "", interim: "" };
    active.current = session; sessionRef.current = session; setDestination(nextMode); setInterim(""); setSeconds(0); setError("");
    if (nextMode !== "dictation") {
      setMode("starting");
      if (!startRecognition(session)) { active.current = null; setMode(null); }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      active.current = null; setMode(null); latest.current.notice("เบราว์เซอร์นี้ไม่รองรับการอัดเสียง"); return;
    }
    setMode("starting");
    let acquired: MediaStream | null = null;
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      acquired = input;
      if (active.current !== session || session.cancelled || !mounted.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(value => MediaRecorder.isTypeSupported(value));
      const recorder = new MediaRecorder(input, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        input.getTracks().forEach(track => track.stop());
        if (media.current === recorder) media.current = null;
        if (!mounted.current) return;
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size && !session.cancelled) latest.current.clip({ id: crypto.randomUUID(), partId, seconds: Math.max(.1, ((session.ended ?? Date.now()) - session.started) / 1000), blob });
        if (!recognition.current && !active.current) setMode(null);
      };
      recorder.onerror = () => {
        input.getTracks().forEach(track => track.stop());
        session.cancelled = true; active.current = null; recognition.current?.abort();
        if (mounted.current) { setMode(null); latest.current.notice("การอัดเสียงขัดข้อง กรุณาลองใหม่"); }
      };
      media.current = recorder; session.started = Date.now(); recorder.start(500); setMode("dictation");
      startRecognition(session);
    } catch {
      acquired?.getTracks().forEach(track => track.stop());
      if (active.current === session) {
        active.current = null;
        if (mounted.current) { setMode(null); latest.current.notice("เปิดไมโครโฟนไม่ได้ กรุณาตรวจสอบสิทธิ์และลองเหยียบใหม่"); }
      }
    }
  }

  function stop(cancelled = false) {
    if (!active.current) {
      if (cancelled && sessionRef.current) { sessionRef.current.cancelled = true; recognition.current?.abort(); }
      return;
    }
    const session = active.current;
    session.cancelled = cancelled;
    session.ended = Date.now();
    active.current = null;
    if (media.current?.state === "recording") media.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
    if (recognition.current) {
      setMode("processing");
      if (cancelled) recognition.current.abort(); else recognition.current.stop();
      speechTimeout.current = setTimeout(() => {
        if (recognition.current) { session.cancelled = true; recognition.current.abort(); latest.current.notice("รับคำพูดนานเกินไป กรุณาพูดคำสั่งใหม่ เสียงที่อัดไว้ยังคงอยู่"); }
      }, 6000);
    } else { setMode(media.current ? "processing" : null); setInterim(""); }
  }
  return { start, stop, mode, destination, interim, seconds, support, error };
}
