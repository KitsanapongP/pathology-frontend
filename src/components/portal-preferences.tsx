"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { translate, type PortalLanguage } from "@/lib/portal-language";

const key = "pathology:portal-preferences:v1";
const defaults = { language: "th" as PortalLanguage, fontSize: 100 };
let fallback = "";
function snapshot() {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("portal-preferences", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("portal-preferences", callback); };
}
type PreferencesValue = typeof defaults & { setLanguage: (language: PortalLanguage) => void; setFontSize: (size: number) => void };
const Preferences = createContext<PreferencesValue>({ ...defaults, setLanguage: () => {}, setFontSize: () => {} });

export default function PortalPreferences({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  let preferences = defaults;
  try {
    const saved = JSON.parse(raw);
    // Map previous 10% steps to the nearest of the three visible presets.
    const fontSize = [90, 100, 110, 120, 130].includes(saved.fontSize) ? saved.fontSize <= 90 ? 90 : saved.fontSize >= 120 ? 120 : 100 : 100;
    preferences = { language: saved.language === "en" ? "en" : "th", fontSize };
  } catch { /* Invalid or unavailable preferences use the Thai default. */ }
  function update(next: typeof defaults) {
    fallback = JSON.stringify(next);
    try { localStorage.setItem(key, fallback); } catch { /* Keep preferences for this tab when storage is unavailable. */ }
    window.dispatchEvent(new Event("portal-preferences"));
  }
  useEffect(() => {
    document.documentElement.lang = preferences.language;
    document.documentElement.style.fontSize = `${16 * preferences.fontSize / 100}px`;
    return () => { document.documentElement.lang = "th"; document.documentElement.style.removeProperty("font-size"); };
  }, [preferences.language, preferences.fontSize]);
  return <Preferences.Provider value={{ ...preferences, setLanguage: language => update({ ...preferences, language }), setFontSize: fontSize => update({ ...preferences, fontSize }) }}>{children}</Preferences.Provider>;
}

export function usePortalLanguage() {
  const preferences = useContext(Preferences);
  return { ...preferences, locale: preferences.language === "en" ? "en-GB" : "th-TH", t: (text: string) => translate(text, preferences.language) };
}

/** Localize UI strings without changing record values or adding DOM wrappers. */
export function PortalText({ children }: { children: React.ReactNode }) {
  const { t } = usePortalLanguage();
  return typeof children === "string" ? t(children) : children;
}
