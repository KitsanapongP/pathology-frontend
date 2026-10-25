"use client";

import type { ButtonHTMLAttributes } from "react";
import type { Pedal } from "@/lib/examination-controls";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pedal: Pedal; pressed: Pedal | null; onPress: (pedal: Pedal) => void; onRelease: (pedal: Pedal, cancelled?: boolean) => void };

function suppressPointerClick() {
  // A release can close/unmount a dialog before the browser emits its click.
  // Consume that trusted click even if it is retargeted to the page behind it;
  // programmatic clicks used to activate the selected control must still work.
  const consume = (event: MouseEvent) => { if (event.isTrusted) { event.preventDefault(); event.stopImmediatePropagation(); } };
  window.addEventListener("click", consume, true);
  window.setTimeout(() => window.removeEventListener("click", consume, true), 0);
}

export default function ExaminationPedalButton({ pedal, pressed, onPress, onRelease, children, ...button }: Props) {
  return <button {...button} type="button" data-pressed={pressed === pedal}
    onClick={event => { event.preventDefault(); event.stopPropagation(); }}
    onPointerDown={event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); onPress(pedal); }}
    onPointerUp={event => { event.preventDefault(); event.stopPropagation(); suppressPointerClick(); onRelease(pedal); }} onPointerCancel={() => onRelease(pedal, true)} onLostPointerCapture={() => onRelease(pedal, true)}
    onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) onPress(pedal); } }}
    onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); onRelease(pedal); } }}
    onBlur={() => onRelease(pedal, true)}
  >{children}</button>;
}
