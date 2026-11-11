export type SessionTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  must_change_password?: boolean;
};
export type SessionState = "checking" | "anonymous" | "authenticated" | "password-required";
export const sessionStorageKey = "pathology:session:v1";
export const passwordChangePath = "/change-password";
type StoredSession = { refresh_token: string; refresh_expires_at: number; must_change_password: boolean };
type Dependencies = {
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">;
  refresh: (refreshToken: string) => Promise<SessionTokens>;
  revoke: (refreshToken: string, accessToken: string | null) => Promise<unknown>;
};

export function sessionDestination(state: SessionState, pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (state === "checking") return null;
  if (state === "password-required") return path === passwordChangePath ? null : passwordChangePath;
  if (state === "anonymous") return path === "/" ? null : "/";
  return path === "/" || path === passwordChangePath ? "/portal" : null;
}

/** Refresh tokens are tab-scoped; access tokens never leave this closure. */
export function createSessionManager(deps: Dependencies) {
  let state: SessionState = "checking";
  let initialized = false;
  let generation = 0;
  let accessToken: string | null = null;
  let expiresAt = 0;
  let refreshAt = 0;
  let stored: StoredSession | null = null;
  let refreshPromise: Promise<string> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: SessionState) => { state = next; listeners.forEach(listener => listener()); };
  function persist() {
    try {
      if (stored) deps.storage().setItem(sessionStorageKey, JSON.stringify(stored));
      else deps.storage().removeItem(sessionStorageKey);
    } catch { /* Storage unavailable: keep this session in memory only. */ }
  }
  function clear() {
    generation++;
    initialized = true;
    clearTimeout(timer);
    accessToken = null; stored = null; expiresAt = 0; refreshAt = 0;
    refreshPromise = null;
    persist(); publish("anonymous");
  }
  function install(tokens: SessionTokens, startedAt: number, initial: boolean) {
    if (!tokens || typeof tokens.access_token !== "string" || !tokens.access_token ||
      typeof tokens.refresh_token !== "string" || !tokens.refresh_token ||
      typeof tokens.token_type !== "string" || tokens.token_type.toLowerCase() !== "bearer" ||
      !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 ||
      !Number.isFinite(tokens.refresh_expires_in) || tokens.refresh_expires_in <= 0 ||
      (initial && typeof tokens.must_change_password !== "boolean")) {
      throw new Error("Invalid auth token response. Verify the backend token contract.");
    }
    const nextExpiry = startedAt + tokens.expires_in * 1000;
    if (nextExpiry <= Date.now()) throw new Error("Token expired before the auth response arrived. Try signing in again.");
    // A refresh response may omit the flag; it can never release a password gate.
    const mustChange = stored?.must_change_password === true || tokens.must_change_password === true;
    stored = { refresh_token: tokens.refresh_token, refresh_expires_at: startedAt + tokens.refresh_expires_in * 1000, must_change_password: mustChange };
    accessToken = tokens.access_token;
    expiresAt = nextExpiry;
    refreshAt = expiresAt - Math.min(30_000, tokens.expires_in * 100);
    persist();
    clearTimeout(timer);
    timer = setTimeout(() => { void refresh().catch(() => {}); }, Math.max(0, refreshAt - Date.now()));
    publish(mustChange ? "password-required" : "authenticated");
  }
  function accept(tokens: SessionTokens, startedAt = Date.now()) {
    clear();
    try { install(tokens, startedAt, true); } catch (error) { clear(); throw error; }
  }
  function refresh(): Promise<string> {
    if (refreshPromise) return refreshPromise;
    if (!stored || stored.refresh_expires_at <= Date.now()) {
      clear(); return Promise.reject(new Error("Session expired. Sign in again."));
    }
    const currentGeneration = generation;
    const refreshToken = stored.refresh_token;
    const startedAt = Date.now();
    const pending = (async () => {
      try {
        const tokens = await deps.refresh(refreshToken);
        if (generation !== currentGeneration) throw new Error("Session changed while refreshing.");
        install(tokens, startedAt, false);
        return accessToken!;
      } catch (error) {
        if (generation === currentGeneration) clear();
        throw error;
      }
    })();
    refreshPromise = pending;
    void pending.finally(() => { if (refreshPromise === pending) refreshPromise = null; }).catch(() => {});
    return pending;
  }
  async function start() {
    if (!initialized) {
      initialized = true;
      try {
        const value: unknown = JSON.parse(deps.storage().getItem(sessionStorageKey) ?? "null");
        if (value && typeof value === "object" && "refresh_token" in value && typeof value.refresh_token === "string" && value.refresh_token &&
          "refresh_expires_at" in value && typeof value.refresh_expires_at === "number" && Number.isFinite(value.refresh_expires_at) && value.refresh_expires_at > Date.now() &&
          "must_change_password" in value && typeof value.must_change_password === "boolean") stored = value as StoredSession;
      } catch { /* Corrupt/blocked storage is treated as signed out. */ }
      if (!stored) { clear(); return; }
    }
    if (state === "checking") await refresh();
  }
  async function getAccessToken() {
    await start();
    if (!stored) return null;
    if (refreshPromise) return refreshPromise;
    if (!accessToken || Date.now() >= refreshAt || Date.now() >= expiresAt) return refresh();
    return accessToken;
  }
  async function recover(rejectedToken: string | null) {
    if (!stored) throw new Error("Session ended. Sign in again.");
    if (refreshPromise) return refreshPromise;
    if (accessToken && accessToken !== rejectedToken && Date.now() < refreshAt) return accessToken;
    return refresh();
  }
  async function logout() {
    const refreshToken = stored?.refresh_token;
    const token = accessToken;
    clear();
    if (refreshToken) await deps.revoke(refreshToken, token);
  }
  return {
    accept, clear, start, getAccessToken, recover, logout,
    getSnapshot: () => state,
    getGeneration: () => generation,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
