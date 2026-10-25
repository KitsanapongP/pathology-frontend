"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { PedalContext } from "@/lib/examination-controls";

export type FootTarget = { label: string; field?: string; lineId?: string; confirm: boolean; adjusting: boolean };
type Options = { context: PedalContext; ready: boolean; root: () => HTMLElement | null };
// Foot navigation is an explicit allowlist, never a scan of the page's controls.
const selector = "[data-pedal-target]";

export function useExaminationFocus(options: Options) {
  const latest = useRef(options);
  const current = useRef<HTMLElement | null>(null);
  const adjusting = useRef(false);
  const [target, setTarget] = useState<FootTarget>({ label: "", confirm: false, adjusting: false });
  useLayoutEffect(() => { latest.current = options; }, [options]);

  const controls = useCallback(() => {
    const root = latest.current.root();
    if (!root) return [];
    // Never scan the background while a dialog is opening or closing.
    if (root.tagName !== "DIALOG" && root.querySelector("dialog[open]")) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(element => !element.matches(":disabled, [aria-disabled=true]") && element.getClientRects().length > 0 && !element.closest("[data-pedal-ignore], [hidden], [inert], dialog:not([open])"));
  }, []);
  const describe = useCallback((element: HTMLElement | null) => {
    const label = element?.getAttribute("aria-label") || element?.textContent?.trim() || "";
    const next: FootTarget = { label, field: element?.dataset.pedalField, lineId: element?.dataset.lineId, confirm: element?.hasAttribute("data-pedal-confirm") ?? false, adjusting: adjusting.current };
    setTarget(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const select = useCallback((element: HTMLElement | null, reveal = true) => {
    if (current.current !== element) current.current?.classList.remove("station-foot-selected");
    current.current = element;
    if (element && !element.classList.contains("station-foot-selected")) element.classList.add("station-foot-selected");
    if (reveal && element) { element.focus({ preventScroll: true }); element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }
    describe(element);
  }, [describe]);

  useLayoutEffect(() => {
    if (!options.ready) return;
    let frame = 0;
    // Modals open in a sibling effect; scan after their top-layer state has settled.
    const refresh = (reset = false) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = controls();
        // Keep the selected field stable while voice processing temporarily disables it.
        const retained = current.current && (items.includes(current.current) || (current.current.matches("input:disabled, textarea:disabled, select:disabled") && latest.current.root()?.contains(current.current) && current.current.getClientRects().length > 0));
        const chosen = !reset && retained ? current.current : items.find(element => element.hasAttribute("data-pedal-default")) ?? items[0] ?? null;
        if (reset) adjusting.current = false;
        select(chosen, reset || current.current !== chosen);
      });
    };
    refresh(true);
    const observer = new MutationObserver(() => refresh());
    const root = latest.current.root();
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled", "hidden", "aria-expanded", "open"] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); current.current?.classList.remove("station-foot-selected"); current.current = null; };
  }, [options.context, options.ready, controls, select]);

  const move = useCallback((direction: number) => {
    const element = current.current;
    if (adjusting.current && element) {
      if (element instanceof HTMLSelectElement) {
        const allowed = Array.from(element.options).map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled);
        const index = allowed.findIndex(item => item.index === element.selectedIndex);
        const next = allowed[Math.max(0, Math.min(allowed.length - 1, index + direction))];
        if (next) { element.selectedIndex = next.index; element.dispatchEvent(new Event("change", { bubbles: true })); }
      } else if (element instanceof HTMLInputElement && element.type === "range") {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        const step = Number(element.step) || 1;
        setter?.call(element, String(Math.max(Number(element.min) || 0, Math.min(Number(element.max) || 100, Number(element.value) + direction * step))));
        element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true }));
      }
      describe(element); return;
    }
    const items = controls();
    if (!items.length) return;
    const index = element ? items.indexOf(element) : -1;
    select(items[(index + direction + items.length) % items.length]);
  }, [controls, describe, select]);
  const activate = useCallback(() => {
    const element = current.current;
    if (!element || !controls().includes(element)) return;
    if (element.hasAttribute("data-pedal-confirm")) return;
    if (element instanceof HTMLSelectElement || (element instanceof HTMLInputElement && element.type === "range")) {
      adjusting.current = !adjusting.current; describe(element); return;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus({ preventScroll: true });
      return;
    }
    element.click();
  }, [controls, describe]);
  const leaveAdjustment = useCallback(() => {
    if (!adjusting.current) return false;
    adjusting.current = false; describe(current.current); return true;
  }, [describe]);
  const getTarget = useCallback((): FootTarget => {
    const element = current.current;
    return { label: element?.getAttribute("aria-label") || element?.textContent?.trim() || "", field: element?.dataset.pedalField, lineId: element?.dataset.lineId, confirm: element?.hasAttribute("data-pedal-confirm") ?? false, adjusting: adjusting.current };
  }, []);
  const selectTarget = useCallback((element: HTMLElement | null) => {
    if (element && controls().includes(element)) select(element, false);
  }, [controls, select]);
  return { target, move, activate, leaveAdjustment, getTarget, selectTarget };
}
