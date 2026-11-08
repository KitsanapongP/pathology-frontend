"use client";

import { useId } from "react";
import { examinationPedalInstructions, pedalBindings, type Pedal, type PedalContext, type PedalPresentation } from "@/lib/examination-controls";
import PortalIcon from "./portal-icon";
import ExaminationPedalButton from "./examination-pedal-button";

type Props = { pressed: Pedal | null; suggested?: Pedal; compact?: boolean; context: PedalContext; primaryAction: string; presentation?: PedalPresentation; onPress: (pedal: Pedal) => void; onRelease: (pedal: Pedal, cancelled?: boolean) => void };

export default function ExaminationPedal({ pressed, suggested, compact, onPress, onRelease, context, primaryAction, presentation }: Props) {
  const id = useId().replace(/:/g, "");
  const instructions = examinationPedalInstructions(context, primaryAction, presentation);
  return <div data-pedal-ignore className={`station-pedal ${compact ? "compact" : ""}`}>
    <div className="station-pedal-hardware">
      <svg viewBox="0 0 720 260" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-base`} x1="360" y1="38" x2="360" y2="237" gradientUnits="userSpaceOnUse"><stop stopColor="#343c40" /><stop offset="1" stopColor="#1b2326" /></linearGradient>
          <linearGradient id={`${id}-key`} x1="0" y1="58" x2="0" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#424a4d" /><stop offset=".42" stopColor="#30393d" /><stop offset=".44" stopColor="#394347" /><stop offset="1" stopColor="#293236" /></linearGradient>
          <pattern id={`${id}-grip`} x="0" y="0" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2" fill="#141e22" /><circle cx="6" cy="5.5" r="1.2" fill="#5f6b6e" /></pattern>
          <filter id={`${id}-shadow`} x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="15" stdDeviation="13" floodColor="#17352e" floodOpacity=".16" /></filter>
        </defs>
        <path d="M360 39V17q0-12-12-12h-26" stroke="#525d60" strokeWidth="7" strokeLinecap="round" /><path d="M360 39V17q0-12-12-12h-26" stroke="#758083" strokeWidth="2" strokeLinecap="round" />
        <g filter={`url(#${id}-shadow)`}>
          <path d="M52 48Q360 18 668 48q20 2 24 24l12 135q2 24-23 28-321 31-642 0-25-4-23-28L28 72q4-22 24-24Z" fill={`url(#${id}-base)`} stroke="#4c5659" strokeWidth="1.5" />
          <path d="M32 215q328 34 656 0" stroke="#566063" strokeOpacity=".55" />
          {["left", "center", "right"].map((name, index) => {
            const pedal = name as Pedal;
            const x = 68 + index * 221;
            const active = pressed === pedal;
            return <g key={pedal} transform={`translate(${x} ${active ? 5 : 0})`}>
              <rect x="-7" y="48" width="155" height="166" rx="13" fill="#101a1d" />
              <rect x="-3" y="43" width="147" height="162" rx="11" fill={`url(#${id}-key)`} stroke={active || suggested === pedal ? pedalBindings[pedal].color : "#596367"} strokeWidth={active ? 3 : 1.5} />
              <rect x="9" y="55" width="123" height="132" rx="6" fill={`url(#${id}-grip)`} />
              <path d="M6 112h126" stroke="#181f22" strokeWidth="2" />
              <rect x="34" y="188" width="74" height="4" rx="2" fill={pedalBindings[pedal].color} opacity={active || suggested === pedal ? 1 : .7} />
            </g>;
          })}
          <circle cx="45" cy="70" r="3" fill="#7b8587" /><circle cx="675" cy="70" r="3" fill="#7b8587" />
        </g>
      </svg>
      <div className="station-pedal-targets">{instructions.map(({ pedal, action, icon }) => <ExaminationPedalButton key={pedal} pedal={pedal} pressed={pressed} onPress={onPress} onRelease={onRelease} aria-label={`ทดลองปุ่ม${pedalBindings[pedal].position} ${action}`} className={pressed === pedal ? "is-pressed" : ""}><PortalIcon name={icon} /></ExaminationPedalButton>)}</div>
    </div>
  </div>;
}
