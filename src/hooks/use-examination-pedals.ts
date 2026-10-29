"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { pedalBindings, pedalForKey, type Pedal, type PedalAction, type PedalContext } from "@/lib/examination-controls";
import { createExaminationGestures } from "@/lib/examination-gestures";

type Actions = { context: PedalContext; enabled: boolean; confirmFocused: boolean; partAdjusting: boolean; start: (action: PedalAction) => void; stop: (action: PedalAction, cancelled: boolean) => void; perform: (action: PedalAction) => void };

export function useExaminationPedals(actions: Actions) {
  const latest = useRef(actions);
  const [pressed, setPressed] = useState<Pedal | null>(null);
  const [lastInput, setLastInput] = useState<"hardware" | "keyboard" | "simulator" | null>(null);
  const controller = useRef<ReturnType<typeof createExaminationGestures> | null>(null);
  useLayoutEffect(() => { latest.current = actions; }, [actions]);
  useEffect(() => {
    const engine = createExaminationGestures({
      start: (action, origin) => { if (origin === latest.current.context) latest.current.start(action); },
      stop: (action, cancelled) => latest.current.stop(action, cancelled),
      perform: (action, origin) => { if (origin === latest.current.context) latest.current.perform(action); },
      pressed: setPressed,
    });
    controller.current = engine;
    return () => { engine.cancel(); controller.current = null; };
  }, []);
  useLayoutEffect(() => { controller.current?.cancel(); }, [actions.context, actions.partAdjusting]);
  const press = useCallback((pedal: Pedal, confirmFocused = latest.current.confirmFocused) => { setLastInput("simulator"); controller.current?.press(pedal, latest.current.context, latest.current.enabled, confirmFocused, latest.current.partAdjusting); }, []);
  const release = useCallback((pedal: Pedal, cancelled = false) => controller.current?.release(pedal, cancelled), []);
  const cancel = useCallback(() => controller.current?.cancel(), []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const pedal = pedalForKey(event.key);
      if (!pedal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      setLastInput(Object.values(pedalBindings).some(binding => binding.hardware === event.key) ? "hardware" : "keyboard");
      controller.current?.press(pedal, latest.current.context, latest.current.enabled, latest.current.confirmFocused, latest.current.partAdjusting);
    };
    const up = (event: KeyboardEvent) => { const pedal = pedalForKey(event.key); if (pedal) { event.preventDefault(); event.stopImmediatePropagation(); controller.current?.release(pedal); } };
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true); window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", hidden); controller.current?.cancel(); };
  }, [cancel]);
  return { pressed, lastInput, press, release, cancel };
}
