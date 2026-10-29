import { resolvePedalBinding, pedalTiming, type Pedal, type PedalAction, type PedalBinding, type PedalContext } from "./examination-controls";

type Callbacks = { start: (action: PedalAction, context: PedalContext) => void; stop: (action: PedalAction, cancelled: boolean) => void; perform: (action: PedalAction, context: PedalContext) => void; pressed: (pedal: Pedal | null) => void };
type Clock = { now: () => number; later: (callback: () => void, ms: number) => unknown; clear: (timer: unknown) => void };

// Plain controller: deterministic tests exercise the same gestures as the UI.
export function createExaminationGestures(callbacks: Callbacks, clock: Clock = { now: Date.now, later: (callback, ms) => setTimeout(callback, ms), clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>) }) {
  let held: { pedal: Pedal; at: number; context: PedalContext; binding: PedalBinding; holdStarted: boolean; timer?: unknown } | null = null;
  let pending: { pedal: Pedal; context: PedalContext; timer: unknown } | null = null;
  function clearPending() { if (pending) clock.clear(pending.timer); pending = null; }
  function press(pedal: Pedal, context: PedalContext, enabled = true, confirmFocused = false, partAdjusting = false) {
    if (!enabled || held) return;
    if (pending && (pending.pedal !== pedal || pending.context !== context)) clearPending();
    const binding = resolvePedalBinding(context, pedal, confirmFocused, partAdjusting);
    const active = { pedal, context, binding, at: clock.now(), holdStarted: false, timer: undefined as unknown };
    held = active;
    callbacks.pressed(pedal);
    if (binding.hold && !binding.minimumHoldMs) {
      active.timer = clock.later(() => {
        if (held !== active) return;
        active.holdStarted = true;
        callbacks.start(binding.hold!, active.context);
      }, binding.holdDelayMs ?? 0);
    }
  }
  function release(pedal: Pedal, cancelled = false) {
    if (!held || held.pedal !== pedal) return;
    const active = held; held = null; callbacks.pressed(null);
    const { binding } = active;
    if (active.timer !== undefined) clock.clear(active.timer);
    if (binding.hold && active.holdStarted) callbacks.stop(binding.hold, cancelled);
    if (cancelled) { clearPending(); return; }
    if (binding.hold && (active.holdStarted || binding.minimumHoldMs)) {
      if (binding.minimumHoldMs && clock.now() - active.at >= binding.minimumHoldMs) callbacks.perform(binding.hold, active.context);
      return;
    }
    if (!binding.doubleTap) { if (binding.tap) callbacks.perform(binding.tap, active.context); return; }
    if (pending?.pedal === pedal && pending.context === active.context) { clearPending(); callbacks.perform(binding.doubleTap, active.context); return; }
    pending = { pedal, context: active.context, timer: clock.later(() => { pending = null; if (binding.tap) callbacks.perform(binding.tap, active.context); }, pedalTiming.doubleTapMs) };
  }
  function cancel() { clearPending(); if (held) release(held.pedal, true); }
  return { press, release, cancel };
}
