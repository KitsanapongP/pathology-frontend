"use client";

import { useRef, useState } from "react";
import PortalIcon from "./portal-icon";
import { shortTime } from "@/lib/examination-data";

export default function ExaminationPlayer({ url, seekTime, durationHint = 0 }: { url: string; seekTime?: number; durationHint?: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(url ? durationHint : 0);
  const [volume, setVolume] = useState(0.75);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState("");
  // Timestamp selection remounts this player with the chosen start time.
  return <div className="exam-player">
    <audio ref={audio} src={url || undefined} onLoadedMetadata={() => { if (audio.current) { const length = audio.current.duration; const total = Number.isFinite(length) ? length : durationHint; setDuration(total); audio.current.volume = volume; audio.current.playbackRate = rate; if (seekTime !== undefined) { audio.current.currentTime = Math.min(seekTime, total || seekTime); void audio.current.play().catch(() => setError("กรุณากดเล่นเสียงอีกครั้ง")); } } }} onTimeUpdate={() => setCurrent(audio.current?.currentTime ?? 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError("ไม่สามารถเล่นไฟล์เสียงได้")} />
    <button type="button" aria-label={playing ? "พักเสียง" : "เล่นเสียง"} disabled={!url} onClick={async () => { if (!audio.current) return; if (playing) audio.current.pause(); else try { await audio.current.play(); } catch { setError("ไม่สามารถเล่นไฟล์เสียงได้"); } }} className="exam-play"><PortalIcon name={playing ? "pause" : "play"} className="size-4" /></button>
    <span className="exam-audio-time">{shortTime(current)} / {shortTime(duration)}</span>
    <input aria-label="ตำแหน่งเสียง" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(current, duration || 1)} disabled={!url || !duration} onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setCurrent(Number(event.target.value)); } }} />
    <PortalIcon name="volume" className="size-4" /><input aria-label="ระดับเสียง" type="range" min={0} max={1} step={0.05} value={volume} disabled={!url} onChange={event => { const value = Number(event.target.value); setVolume(value); if (audio.current) audio.current.volume = value; }} />
    <select aria-label="ความเร็วเสียง" value={rate} disabled={!url} onChange={event => { const value = Number(event.target.value); setRate(value); if (audio.current) audio.current.playbackRate = value; }}>{[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value.toFixed(2).replace(/0$/, "")}x</option>)}</select>
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </div>;
}
