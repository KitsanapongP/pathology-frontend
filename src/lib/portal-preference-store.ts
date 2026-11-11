import type { PortalLanguage } from "@/lib/portal-language";

export const portalPreferencesKey = "pathology:portal-preferences:v1";
let fallback = "";
export function portalPreferencesSnapshot() {
  try { return localStorage.getItem(portalPreferencesKey) ?? fallback; } catch { return fallback; }
}
export function savePortalPreferences(value: string) {
  fallback = value;
  try { localStorage.setItem(portalPreferencesKey, value); } catch { /* Preserve tab-local preferences. */ }
  window.dispatchEvent(new Event("portal-preferences"));
}
export function portalLanguageSnapshot(): PortalLanguage {
  try { return JSON.parse(portalPreferencesSnapshot()).language === "en" ? "en" : "th"; } catch { return "th"; }
}
