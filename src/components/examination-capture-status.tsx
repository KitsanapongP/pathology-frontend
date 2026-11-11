"use client";

import { useEffect, useState } from "react";
import { microphoneWaveform, smoothWaveform, waveformPath } from "@/lib/examination-audio-level";
import { shortTime } from "@/lib/examination-data";

type Props = { phase: "off" | "starting" | "recording" | "processing"; stream: MediaStream | null; seconds: number };
const silence = Array<number>(160).fill(0);

export default function ExaminationCaptureStatus({ phase, stream, seconds }: Props) {
  const [signal, setSignal] = useState<{ stream: MediaStream | null; levels: number[]; unavailable: boolean }>({ stream: null, levels: silence, unavailable: false });
  useEffect(() => {
    if (phase !== "recording" || !stream) return;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let frame = 0;
    let disposed = false;
    const start = async () => {
      if (disposed) return;
      try {
        context = new AudioContext();
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser); // Do not connect to speakers: no monitoring feedback.
        await context.resume();
        if (disposed) return;
        const samples = new Uint8Array(analyser.fftSize);
        let lastUpdate = 0;
        let smoothed = silence;
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const draw = (time: number) => {
          if (disposed || !analyser) return;
          if (time - lastUpdate >= (reducedMotion ? 100 : 16)) {
            analyser.getByteTimeDomainData(samples);
            smoothed = smoothWaveform(smoothed, microphoneWaveform(samples), Math.min(100, time - lastUpdate));
            setSignal({ stream, levels: smoothed, unavailable: false });
            lastUpdate = time;
          }
          frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
      } catch {
        if (!disposed) setSignal({ stream, levels: silence, unavailable: true });
      }
    };
    void Promise.resolve().then(start);
    return () => { disposed = true; cancelAnimationFrame(frame); source?.disconnect(); analyser?.disconnect(); if (context) void context.close().catch(() => {}); };
  }, [phase, stream]);
  const active = phase === "recording";
  const levels = active && signal.stream === stream ? signal.levels : silence;
  const label = active ? "กำลังบันทึกเสียง" : phase === "starting" ? "กำลังเปิดไมโครโฟน" : phase === "processing" ? "กำลังประมวลผลเสียง" : "ไมค์ปิด";
  return <div className="station-capture-status" data-phase={phase}>
    <div className="station-capture-speaker" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M5 18h8L26 8v32L13 30H5Z" fill="currentColor"/><path d="M32 17a10 10 0 0 1 0 14m5-20a18 18 0 0 1 0 26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></div>
    <span className="station-mic-label" role="status">{label}</span>
    <svg className="station-audio-wave" viewBox="0 0 480 64" preserveAspectRatio="none" role="img" aria-label="คลื่นเสียงจากไมโครโฟน"><path d={waveformPath(levels)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>
    {active && signal.stream === stream && signal.unavailable && <span className="station-audio-unavailable">วัดระดับเสียงไม่ได้</span>}
    <time className="station-capture-time" aria-label="เวลาอัดสะสม">{shortTime(seconds)}</time>
  </div>;
}
