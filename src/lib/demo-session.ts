export type DemoRole = "workspace" | "admin";
export type DemoState = DemoRole | "anonymous" | "checking";
const key = "pathology:demo-session:v1";
const event = "pathology-demo-session";
let fallback: DemoRole | null = null;

export function isDemoAuth() { return process.env.NEXT_PUBLIC_AUTH_MODE === "demo"; }
export function demoSnapshot(): DemoState {
  try {
    const value = sessionStorage.getItem(key);
    return value === "workspace" || value === "admin" ? value : fallback ?? "anonymous";
  } catch { return fallback ?? "anonymous"; }
}
export function subscribeDemo(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", listener); };
}
export function enterDemo(role: DemoRole) {
  if (!isDemoAuth()) throw new Error("Demo entry requires NEXT_PUBLIC_AUTH_MODE=demo.");
  fallback = role;
  try { sessionStorage.setItem(key, role); } catch { /* Memory-only preview when storage is blocked. */ }
  window.dispatchEvent(new Event(event));
}
export function leaveDemo() {
  fallback = null;
  try { sessionStorage.removeItem(key); } catch { /* Clear the memory fallback. */ }
  window.dispatchEvent(new Event(event));
}
export function demoDestination(state: DemoState, pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (state === "checking") return null;
  if (state === "anonymous") return path === "/" ? null : "/";
  if (path === "/" || path === "/change-password") return state === "admin" ? "/portal/admin" : "/portal";
  if (state === "workspace" && (path === "/portal/admin" || path.startsWith("/portal/admin/"))) return "/portal";
  return null;
}
