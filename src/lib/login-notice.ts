const key = "pathology:login-notice:v1";
let fallback = false;
export function markPasswordChanged() {
  fallback = true;
  try { sessionStorage.setItem(key, "password-changed"); } catch { /* Keep notice in this tab. */ }
}
export function hasPasswordChangedNotice() {
  try { return sessionStorage.getItem(key) === "password-changed" || fallback; } catch { return fallback; }
}
export function clearLoginNotice() {
  fallback = false;
  try { sessionStorage.removeItem(key); } catch { /* Memory notice is cleared. */ }
}
